import { env } from '@/config/env'

const getNormalizedAuthUrl = (url: string): string => {
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url

  if (normalizedUrl.endsWith('/api/auth')) {
    return normalizedUrl
  }

  return `${normalizedUrl}/api/auth`
}

export const appConfig = {
  /**
   * Core application settings.
   */
  app: {
    /** Port the HTTP server listens on */
    port: env.PORT,

    /** Public base URL of the application */
    url: env.BASE_URL,

    /** Current runtime environment (development | production | test) */
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL
  },
  /**
   * Database configuration.
   */
  database: {
    /** Database connection URL */
    url: env.DATABASE_URL
  },
  /**
   * Redis configuration.
   */
  redis: {
    upstash: {
      tcp: {
        url: env.UPSTASH_REDIS_TCP_URL
      }
    },
    url: env.REDIS_URL,
    port: env.REDIS_PORT,
    host: env.REDIS_HOST,
    username: env.REDIS_USERNAME,
    db_index: env.REDIS_DB_INDEX,
    password: env.REDIS_PASSWORD,
    queuePrefix: 'devtrack'
  },
  /**
   * SMTP configuration
   */
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
    secure: env.SMTP_SECURE
  },

  /**
   * Auth configuration
   */
  auth: {
    /** Secret used by Better Auth for signing tokens */
    secret: env.BETTER_AUTH_SECRET,

    /** Public URL used by Better Auth */
    url: getNormalizedAuthUrl(env.BETTER_AUTH_URL)
  },

  /**
   * Encryption configuration
   */
  crypto: {
    algo: 'aes-256-gcm',
    iv_len: Number(12),
    auth_tag_len: Number(16),
    encryption_segment_count: Number(3)
  },
  /**
   * Frontend configuration
   */
  frontend: {
    url: env.FRONTEND_URL
  },

  /**
   * Notion configuration
   */
  notion: {
    apiBaseUrl: 'https://api.notion.com/v1',
    apiVersion: '2025-09-03',
    encryptionKey: env.NOTION_ENCRYPTION_KEY
  }
} as const
