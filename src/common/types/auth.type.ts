import type { Request } from 'express'
import type { HttpContext } from '@/core/types/http-context.types'
import type { Role } from '@prisma/client'

// types
type AuthenticatedUser = {
  id: string
  email: string
  name: string
  role: Role
  organizationId?: string
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser
}

export type AuthenticatedHttpContext = Omit<HttpContext, 'req'> & {
  req: AuthenticatedRequest
}
