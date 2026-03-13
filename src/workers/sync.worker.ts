import { randomUUID } from 'crypto'

import { Worker, type BackoffStrategy } from 'bullmq'
import { SyncStatus } from '@prisma/client'

import { appConfig } from '@/config/config'
import { logger } from '@/core/logger/logger'
import {
  fetchTicketsForSync,
  isNotionRateLimitError
} from '@/features/notion/notion.service'
import {
  insertSyncLog,
  persistTicketSync
} from '@/features/notion/notion.repo'
import { calculateProjectProgress } from '@/features/progress/progress.service'
import { createRedisConnection } from '@/lib/redis'
import { getBullMqConnectionOptions } from '@/lib/redis'
import {
  SYNC_JOB_NAME,
  SYNC_QUEUE_NAME,
  type SyncJobData
} from '@/workers/sync.queue'

const PROJECT_SYNC_LOCK_PREFIX = 'ticket-sync-lock'
const PROJECT_SYNC_LOCK_TTL_MS = 15 * 60 * 1000
const RATE_LIMIT_BACKOFF_BASE_DELAY_MS = 30 * 1000
const RATE_LIMIT_BACKOFF_MAX_DELAY_MS = 10 * 60 * 1000

const lockConnection = createRedisConnection('ticket-sync-lock')

const getProjectSyncLockKey = (projectId: string): string => {
  return `${PROJECT_SYNC_LOCK_PREFIX}:${projectId}`
}

const acquireProjectSyncLock = async (
  projectId: string,
  token: string
): Promise<boolean> => {
  const result = await lockConnection.set(
    getProjectSyncLockKey(projectId),
    token,
    'PX',
    PROJECT_SYNC_LOCK_TTL_MS,
    'NX'
  )

  return result === 'OK'
}

const releaseProjectSyncLock = async (
  projectId: string,
  token: string
): Promise<void> => {
  await lockConnection.eval(
    `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end

      return 0
    `,
    1,
    getProjectSyncLockKey(projectId),
    token
  )
}

const rateLimitBackoffStrategy: BackoffStrategy = (
  attemptsMade,
  _type,
  error
): number => {
  if (!isNotionRateLimitError(error)) {
    return -1
  }

  const nextDelay = RATE_LIMIT_BACKOFF_BASE_DELAY_MS * 2 ** (attemptsMade - 1)
  return Math.min(nextDelay, RATE_LIMIT_BACKOFF_MAX_DELAY_MS)
}

const processSyncJob = async (data: SyncJobData) => {
  const lockToken = randomUUID()
  const hasLock = await acquireProjectSyncLock(data.projectId, lockToken)

  if (!hasLock) {
    logger.info('Skipping duplicate project sync job.', {
      projectId: data.projectId,
      trigger: data.trigger
    })

    return {
      projectId: data.projectId,
      skipped: true
    }
  }

  try {
    const tickets = await fetchTicketsForSync(data.projectId)
    const syncedAt = new Date()
    const persisted = await persistTicketSync(data.projectId, tickets, syncedAt)
    const projectProgress = await calculateProjectProgress(data.projectId)

    await insertSyncLog(
      data.projectId,
      SyncStatus.SUCCESS,
      persisted.ticketsAdded,
      persisted.ticketsUpdated + persisted.ticketsMarkedMissing
    )

    return {
      projectId: data.projectId,
      skipped: false,
      projectProgress,
      ...persisted
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ticket sync failed.'

    if (isNotionRateLimitError(error)) {
      await insertSyncLog(
        data.projectId,
        SyncStatus.RATE_LIMITED,
        0,
        0,
        errorMessage
      )

      throw error
    }

    await insertSyncLog(
      data.projectId,
      SyncStatus.FAILED,
      0,
      0,
      errorMessage
    )

    throw error
  } finally {
    await releaseProjectSyncLock(data.projectId, lockToken)
  }
}

export const createSyncWorker = (): Worker<SyncJobData, unknown, string> => {
  const worker = new Worker<SyncJobData, unknown, string>(
    SYNC_QUEUE_NAME,
    async (job) => {
      return processSyncJob(job.data)
    },
    {
      concurrency: 2,
      connection: getBullMqConnectionOptions('ticket-sync-worker'),
      prefix: appConfig.redis.queuePrefix,
      settings: {
        backoffStrategy: rateLimitBackoffStrategy
      }
    }
  )

  worker.on('completed', (job) => {
    logger.info('Project sync job completed.', {
      jobId: job.id,
      jobName: job.name,
      projectId: job.data.projectId
    })
  })

  worker.on('failed', (job, error) => {
    logger.error('Project sync job failed.', {
      jobId: job?.id,
      jobName: job?.name ?? SYNC_JOB_NAME,
      projectId: job?.data.projectId,
      error: error.message
    })
  })

  return worker
}

export const closeSyncWorkerDependencies = async (): Promise<void> => {
  await lockConnection.quit()
}
