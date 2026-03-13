import type { Request } from 'express'

import { UnauthorizedError } from '@/core/errors/unauthorized.error'
import { asyncHandler } from '@/core/middleware/async-handler'
import type { HttpContext } from '@/core/types/http-context.types'
import type { ClientTokenIdentifier } from '@/features/client/client.schema'
import { getClientAccessByToken } from '@/features/client/client.service'

type ClientAuthRequest = Request & {
  validatedParams: ClientTokenIdentifier
  clientAccess?: {
    id: string
    projectId: string
  }
}

type ClientAuthHttpContext = Omit<HttpContext, 'req'> & {
  req: ClientAuthRequest
}

export const requireClientAuthMiddleware = asyncHandler(
  async ({ req, next }: ClientAuthHttpContext) => {
    const token = req.validatedParams?.token

    if (!token) {
      throw new UnauthorizedError('Client access token is required.')
    }

    const clientAccess = await getClientAccessByToken(token)

    req.clientAccess = clientAccess

    next()
  }
)
