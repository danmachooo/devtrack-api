import { ForbiddenError } from '@/core/errors/forbidden.error'
import { UnauthorizedError } from '@/core/errors/unauthorized.error'
import { asyncHandler } from '@/core/middleware/async-handler'
import type { HttpContext } from '@/core/types/http-context.types'
import type { Role } from '@prisma/client'

export const requireRoleMiddleware = (...allowedRoles: Role[]) =>
  asyncHandler(async (http: HttpContext) => {

    if(!http.req.user) {
        throw new UnauthorizedError("Unauthorized.")
    }

    const userRole = http.req.user.role

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      )
    }
    http.next()
  })
