import { Queue, type Job, type JobsOptions } from 'bullmq'

import { appConfig } from '@/config/config'
import { getBullMqConnectionOptions } from '@/lib/redis'

export const SYNC_QUEUE_NAME = 'ticket-sync'
export const SYNC_JOB_NAME = 'sync-project-tickets'

export type SyncJobData = {
  projectId: string
  trigger: 'manual' | 'scheduled'
}

const MANUAL_SYNC_JOB_PREFIX = 'manual-project-sync'
const PROJECT_SYNC_SCHEDULER_PREFIX = 'project-sync-scheduler'
const RATE_LIMIT_BACKOFF_TYPE = 'notion-rate-limit'

let syncQueue: Queue<SyncJobData, unknown, string> | undefined

const getDefaultSyncJobOptions = (): JobsOptions => {
  return {
    attempts: 4,
    backoff: {
      type: RATE_LIMIT_BACKOFF_TYPE
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
}

const getQueue = (): Queue<SyncJobData, unknown, string> => {
  syncQueue ??= new Queue<SyncJobData>(SYNC_QUEUE_NAME, {
    connection: getBullMqConnectionOptions('ticket-sync-queue'),
    prefix: appConfig.redis.queuePrefix
  })

  return syncQueue
}

const isPendingState = (
  state: Awaited<ReturnType<Job['getState']>>
): boolean => {
  return (
    state === 'active' ||
    state === 'waiting' ||
    state === 'delayed' ||
    state === 'prioritized'
  )
}

export const getProjectSyncJobId = (projectId: string): string => {
  return `${MANUAL_SYNC_JOB_PREFIX}-${projectId}`
}

export const getProjectSyncSchedulerId = (projectId: string): string => {
  return `${PROJECT_SYNC_SCHEDULER_PREFIX}:${projectId}`
}

export const isProjectSyncQueued = async (projectId: string): Promise<boolean> => {
  const queue = getQueue()
  const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'prioritized'])

  return jobs.some((job) => job.data.projectId === projectId)
}

export const enqueueProjectSync = async (
  projectId: string,
  trigger: SyncJobData['trigger']
): Promise<{
  alreadyQueued: boolean
  jobId: string
}> => {
  const queue = getQueue()
  const jobId = getProjectSyncJobId(projectId)
  const existingJob = await queue.getJob(jobId)

  if (existingJob) {
    const state = await existingJob.getState()

    if (isPendingState(state)) {
      return {
        alreadyQueued: true,
        jobId
      }
    }
  }

  if (await isProjectSyncQueued(projectId)) {
    return {
      alreadyQueued: true,
      jobId
    }
  }

  await queue.add(
    SYNC_JOB_NAME,
    {
      projectId,
      trigger
    },
    {
      ...getDefaultSyncJobOptions(),
      jobId
    }
  )

  return {
    alreadyQueued: false,
    jobId
  }
}

export const upsertProjectSyncScheduler = async (
  projectId: string,
  syncIntervalInMinutes: number
): Promise<void> => {
  const queue = getQueue()

  await queue.upsertJobScheduler(
    getProjectSyncSchedulerId(projectId),
    {
      every: syncIntervalInMinutes * 60 * 1000
    },
    {
      name: SYNC_JOB_NAME,
      data: {
        projectId,
        trigger: 'scheduled'
      },
      opts: getDefaultSyncJobOptions()
    }
  )
}

export const listProjectSyncSchedulers = async () => {
  const queue = getQueue()
  return queue.getJobSchedulers()
}

export const removeProjectSyncScheduler = async (
  projectId: string
): Promise<void> => {
  const queue = getQueue()
  await queue.removeJobScheduler(getProjectSyncSchedulerId(projectId))
}

export const closeSyncQueue = async (): Promise<void> => {
  if (!syncQueue) {
    return
  }

  await syncQueue.close()
  syncQueue = undefined
}
