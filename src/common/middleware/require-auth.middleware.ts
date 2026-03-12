import type { HttpContext } from '@/core/types/http-context.types'
import type { Role } from '@prisma/client'
import { UnauthorizedError } from '@/core/errors/unauthorized.error'
import { asyncHandler } from '@/core/middleware/async-handler'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fromNodeHeaders } from 'better-auth/node'


export const requireAuthMiddleware = asyncHandler(async (http: HttpContext) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(http.req.headers),
    query: {
      disableCookieCache: true
    }
  })

  if (!session?.user) {
    throw new UnauthorizedError('Unauthorized.')
  }

  const activeOrganizationId =
    'activeOrganizationId' in session.session
      ? session.session.activeOrganizationId
      : undefined

  const membership = activeOrganizationId
    ? await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrganizationId,
            userId: session.user.id
          }
        }
      })
    : null

  http.req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (membership?.role ?? session.user.role) as Role,
    organizationId: activeOrganizationId ?? undefined
  }
  http.next()
})
