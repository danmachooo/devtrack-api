import { Router } from 'express'

import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateParams, validateQuery } from '@/core/middleware/validate'
import { getSyncLogsController } from '@/features/sync-logs/sync-logs.controller'
import {
  syncLogsProjectIdentifierSchema,
  syncLogsQuerySchema
} from '@/features/sync-logs/sync-logs.schema'

const syncLogsRouter = Router({ mergeParams: true })

syncLogsRouter.get(
  '/logs',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  validateParams(syncLogsProjectIdentifierSchema),
  validateQuery(syncLogsQuerySchema),
  getSyncLogsController
)

export { syncLogsRouter }
