import { Router } from 'express'

import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  connectNotionController,
  enqueueManualSyncController,
  getDefaultStatusMappingController,
  listNotionDatabasesController,
  saveStatusMappingController,
  testNotionConnectionController
} from '@/features/notion/notion.controller'
import {
  connectNotionSchema,
  defaultStatusMappingParamsSchema,
  projectNotionIdentifierSchema,
  saveStatusMappingSchema,
  testNotionConnectionSchema
} from '@/features/notion/notion.schema'

const notionRouter = Router({ mergeParams: true })

notionRouter.post(
  '/connect',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectNotionIdentifierSchema),
  validateBody(connectNotionSchema),
  connectNotionController
)

notionRouter.post(
  '/test',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectNotionIdentifierSchema),
  validateBody(testNotionConnectionSchema),
  testNotionConnectionController
)

notionRouter.get(
  '/databases',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectNotionIdentifierSchema),
  listNotionDatabasesController
)

notionRouter.post(
  '/sync',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(projectNotionIdentifierSchema),
  enqueueManualSyncController
)

notionRouter.post(
  '/mapping',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectNotionIdentifierSchema),
  validateBody(saveStatusMappingSchema),
  saveStatusMappingController
)

notionRouter.get(
  '/status-mapping/default',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(defaultStatusMappingParamsSchema),
  getDefaultStatusMappingController
)

export { notionRouter }
