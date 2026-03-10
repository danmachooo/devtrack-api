import { z } from 'zod'

const envSchema = z.object({
  //app
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.url(),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),

  // auth
  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),

  // db
  DATABASE_URL: z.string().min(1),

  //frontend
  FRONTEND_URL: z.url()
})

export const env = envSchema.parse(process.env)
