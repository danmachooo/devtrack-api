import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { appConfig } from '@/config/config'

const connectionString = appConfig.database.url

const adapter = new PrismaPg({ connectionString })

export const prisma = new PrismaClient({
  adapter,
  log:
    appConfig.app.nodeEnv === 'development'
      ? ['query', 'error', 'warn']
      : ['error']
})

export type PrismaDbClient = typeof prisma
