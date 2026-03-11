import { appConfig } from '@/config/config'
import { hashPassword, verifyPassword } from '@/core/utils/password'
import { prisma } from '@/lib/prisma'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

export const auth = betterAuth({
  baseURL: appConfig.auth.url,
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'DEVELOPER',
        input: false
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword
    }
  },
  trustedOrigins: [appConfig.frontend.url],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: 'compact'
    }
  }
})
