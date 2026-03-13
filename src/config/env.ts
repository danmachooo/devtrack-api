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
  FRONTEND_URL: z.url(),

  //smtp
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.email().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  SMTP_SECURE: z.coerce.boolean().default(false),

  // notion
  NOTION_ENCRYPTION_KEY: z.string().min(32)
})

export const env = envSchema.parse(process.env)
