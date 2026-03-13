import type { Request, Response } from 'express'

import { asyncHandler } from '@/core/middleware/async-handler'
import type { HttpContext } from '@/core/types/http-context.types'
import { sendResponse } from '@/core/utils/response'
import { getClientDashboardData } from '@/features/client/client.service'

type ClientRequest = Request & {
  clientAccess: {
    id: string
    projectId: string
  }
}

type ClientHttpContext = Omit<HttpContext, 'req' | 'res'> & {
  req: ClientRequest
  res: Response
}

export const getClientDashboardController = asyncHandler(
  async ({ req, res }: ClientHttpContext) => {
    const result = await getClientDashboardData(
      req.clientAccess.id,
      req.clientAccess.projectId
    )

    return sendResponse(
      res,
      200,
      'Client dashboard has been found.',
      result
    )
  }
)
