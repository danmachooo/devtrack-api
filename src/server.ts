import app from '@/app'
import { appConfig } from '@/config/config'
import { logger } from '@/core/logger/logger'

const server = app.listen(appConfig.app.port, () => {
  logger.info(`Server started on port ${appConfig.app.port}`)
})

const shutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown.`)

  server.close(() => {
    logger.info('HTTP server closed successfully.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
