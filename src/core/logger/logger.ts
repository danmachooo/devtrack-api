import path from 'path'
import util from 'util'

import winston from 'winston'

import { appConfig } from '@/config/config'

const { combine, timestamp, errors, printf, colorize, json } = winston.format

const logFormat = printf((info) => {
  const { level, message, timestamp: ts, stack } = info
  const meta = Object.fromEntries(
    Object.entries(info).filter(
      ([key]) => !['level', 'message', 'timestamp', 'stack'].includes(key)
    )
  )
  const metaKeys = Object.keys(meta)
  const metaText =
    metaKeys.length > 0
      ? ` meta=${util.inspect(meta, { depth: null, colors: false, compact: true, breakLength: 120 })}`
      : ''

  if (stack) {
    return `${ts} [${level}]: ${message}${metaText}\n${stack}`
  }

  return `${ts} [${level}]: ${message}${metaText}`
})

export const logger = winston.createLogger({
  level: appConfig.app.logLevel,
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.File({
      filename: path.resolve('logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({ filename: path.resolve('logs/combined.log') })
  ]
})

if (appConfig.app.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        errors({ stack: true }),
        logFormat
      )
    })
  )
} else {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), logFormat)
    })
  )
}
