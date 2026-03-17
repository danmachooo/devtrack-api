import { appConfig } from '@/config/config'
import { hashPassword, verifyPassword } from '@/core/utils/password'
import { sendOrganizationInvitationEmail } from '@/lib/mailer'
import { prisma } from '@/lib/prisma'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins/organization'
import {
  memberAc,
  ownerAc
} from 'better-auth/plugins/organization/access'

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
        defaultValue: 'TEAM_LEADER',
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
  },
  cookies: {
    sessionToken: {
      attributes: {
        secure: true,
        sameSite: true
      }
    }
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'TEAM_LEADER',
      sendInvitationEmail: async (data) => {
        await sendOrganizationInvitationEmail({
          invitationId: data.id,
          email: data.email,
          organizationName: data.organization.name,
          inviterEmail: data.inviter.user.email,
          role: data.role
        })
      },
      roles: {
        TEAM_LEADER: ownerAc,
        BUSINESS_ANALYST: memberAc,
        QUALITY_ASSURANCE: memberAc,
        DEVELOPER: memberAc
      }
    })
  ]
})
