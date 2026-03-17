import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type {
  AssignTicketFeatureInput,
  BulkAssignTicketFeatureInput,
  TicketFilters,
  TicketIdentifier,
  TicketProjectIdentifier
} from '@/features/tickets/ticket.schema'
import {
  assignTicketsToFeatureBulk,
  assignTicketToFeature,
  getTicketsByProject
} from '@/features/tickets/tickets.service'

export const getTicketsController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: TicketProjectIdentifier = http.req.validatedParams
    const query: TicketFilters = http.req.validatedQuery

    const result = await getTicketsByProject(
      project.id,
      http.req.user.organizationId,
      query
    )

    return sendResponse(http.res, 200, 'Tickets have been found.', result)
  }
)

export const assignTicketFeatureController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const ticket: TicketIdentifier = http.req.validatedParams
    const body: AssignTicketFeatureInput = http.req.validatedBody

    const result = await assignTicketToFeature(
      ticket.id,
      http.req.user.organizationId,
      body
    )

    return sendResponse(http.res, 200, 'Ticket feature has been updated.', result)
  }
)

export const assignTicketsFeatureBulkController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const body: BulkAssignTicketFeatureInput = http.req.validatedBody

    const result = await assignTicketsToFeatureBulk(
      http.req.user.organizationId,
      body
    )

    return sendResponse(
      http.res,
      200,
      'Ticket features have been updated.',
      result
    )
  }
)
