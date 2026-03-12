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

  auth: {
    /** Secret used by Better Auth for signing tokens */
    secret: env.BETTER_AUTH_SECRET,

    /** Public URL used by Better Auth */
    url: getNormalizedAuthUrl(env.BETTER_AUTH_URL)
  },
  frontend: {
    url: env.FRONTEND_URL
  }
} as const
