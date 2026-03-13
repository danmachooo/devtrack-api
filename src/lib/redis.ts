import type { ConnectionOptions } from 'bullmq'
import IORedis, { type RedisOptions } from 'ioredis'

import { appConfig } from '@/config/config'

/**
 * Single source of truth for Redis Configuration
 */
const getRedisUrl = (): string | undefined => {
  return appConfig.redis.upstash.tcp.url || appConfig.redis.url
}

const getBaseRedisConfig = (): RedisOptions => {
  return {
    port: appConfig.redis.port,
    host: appConfig.redis.host,
    username: appConfig.redis.username,
    password: appConfig.redis.password,
    db: appConfig.redis.db_index,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true
  }
}

const getResolvedRedisConfig = (
  connectionName: string
): {
  url?: string
  options: RedisOptions
} => {
  const url = getRedisUrl()
  const options: RedisOptions = {
    ...getBaseRedisConfig(),
    connectionName
  }

  return {
    url,
    options
  }
}

/**
 * 
 * @param connectionName The name of the connection
 * @returns redis instance
 */

export const createRedisConnection = (connectionName: string): IORedis => {
  const resolved = getResolvedRedisConfig(connectionName)

  if (resolved.url) {
    return new IORedis(resolved.url, resolved.options)
  }

  return new IORedis(resolved.options)
}

/**
 * 
 * @param connectionName The name of the connection
 * @returns BullMQ connection options
 */
export const getBullMqConnectionOptions = (
  connectionName: string
): ConnectionOptions => {
  const resolved = getResolvedRedisConfig(connectionName)

  if (resolved.url) {
    return {
      url: resolved.url,
      connectionName,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true
    }
  }

  return resolved.options
}
