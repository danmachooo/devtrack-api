import { Router } from 'express'

import { requireClientAuthMiddleware } from '@/common/middleware/require-client-auth.middleware'
import { validateParams } from '@/core/middleware/validate'
import { getClientDashboardController } from '@/features/client/client.controller'
import { clientTokenIdentifierSchema } from '@/features/client/client.schema'

const clientRouter = Router()

clientRouter.get(
  '/:token',
  validateParams(clientTokenIdentifierSchema),
  requireClientAuthMiddleware,
  getClientDashboardController
)

export { clientRouter }
