import "dotenv/config"

import { logger } from '@/core/logger/logger'
import { closeSyncQueue } from '@/workers/sync.queue'
import {
  startSyncScheduler
} from '@/workers/sync.scheduler'
import {
  closeSyncWorkerDependencies,
  createSyncWorker
} from '@/workers/sync.worker'

const startWorker = async (): Promise<void> => {
  const worker = createSyncWorker()
  const scheduler = await startSyncScheduler()

  logger.info('Ticket sync worker started.')

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Starting worker shutdown.`)

    const forceExitTimeout = setTimeout(() => {
      logger.error('Worker shutdown timed out. Forcing exit.')
      process.exit(1)
    }, 10 * 1000)

    await scheduler.stop()
    await worker.close()
    await closeSyncQueue()
    await closeSyncWorkerDependencies()
    clearTimeout(forceExitTimeout)

    logger.info('Worker shutdown completed.')
    process.exit(0)
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
}

void startWorker().catch((error) => {
  logger.error('Ticket sync worker failed to start.', {
    error: error instanceof Error ? error.message : 'Unknown error'
  })

  process.exit(1)
})
