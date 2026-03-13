import { Router } from 'express'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import {
  validateBody,
  validateParams,
  validateQuery
} from '@/core/middleware/validate'
import {
  assignTicketFeatureController,
  getTicketsController
} from '@/features/tickets/ticket.controller'
import {
  assignTicketFeatureSchema,
  ticketFiltersSchema,
  ticketIdentifierSchema,
  ticketProjectIdentifierSchema
} from '@/features/tickets/ticket.schema'

const projectTicketRouter = Router({ mergeParams: true })
const ticketRouter = Router()

projectTicketRouter.get(
  '/',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  validateParams(ticketProjectIdentifierSchema),
  validateQuery(ticketFiltersSchema),
  getTicketsController
)

ticketRouter.patch(
  '/:id/feature',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(ticketIdentifierSchema),
  validateBody(assignTicketFeatureSchema),
  assignTicketFeatureController
)

export { projectTicketRouter, ticketRouter }
