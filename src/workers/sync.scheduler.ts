import { logger } from '@/core/logger/logger'
import { findConnectedProjectsForScheduling } from '@/features/notion/notion.repo'
import {
  getProjectSyncSchedulerId,
  listProjectSyncSchedulers,
  removeProjectSyncScheduler,
  upsertProjectSyncScheduler
} from '@/workers/sync.queue'

const SCHEDULER_REFRESH_INTERVAL_MS = 60 * 1000

export const syncProjectSchedulers = async (): Promise<void> => {
  const projects = await findConnectedProjectsForScheduling()
  const connectedSchedulerIds = new Set(
    projects.map((project) => getProjectSyncSchedulerId(project.id))
  )

  await Promise.all(
    projects.map((project) =>
      upsertProjectSyncScheduler(project.id, project.syncInterval)
    )
  )

  const existingSchedulers = await listProjectSyncSchedulers()

  await Promise.all(
    existingSchedulers
      .filter(
        (scheduler) =>
          scheduler.key.startsWith('project-sync-scheduler:') &&
          !connectedSchedulerIds.has(scheduler.key)
      )
      .map((scheduler) =>
        removeProjectSyncScheduler(
          scheduler.key.replace('project-sync-scheduler:', '')
        )
      )
  )
}

export const startSyncScheduler = async (): Promise<{
  stop: () => Promise<void>
}> => {
  await syncProjectSchedulers()

  const interval = setInterval(() => {
    void syncProjectSchedulers().catch((error) => {
      logger.error('Failed to refresh project sync schedulers.', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    })
  }, SCHEDULER_REFRESH_INTERVAL_MS)

  return {
    stop: async () => {
      clearInterval(interval)
    }
  }
}
