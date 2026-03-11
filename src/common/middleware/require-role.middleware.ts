import { ForbiddenError } from '@/core/errors/forbidden.error'
import { asyncHandler } from '@/core/middleware/async-handler'
import type { HttpContext } from '@/core/types/http-context.types'
import type { Role } from '@prisma/client'

export const requireRole = (...allowedRoles: Role[]) =>
  asyncHandler(async (http: HttpContext) => {
    const userRole = http.req.user.role

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      )
    }
    http.next()
  })
