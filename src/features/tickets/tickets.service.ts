import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { ValidationError } from '@/core/errors/validation.error'
import { findFeatureById } from '@/features/features/features.repo'
import { findProjectById } from '@/features/projects/projects.repo'
import type {
  AssignTicketFeatureInput,
  BulkAssignTicketFeatureInput,
  TicketFilters
} from '@/features/tickets/ticket.schema'
import {
  findTicketById,
  findTicketsByIds,
  findTicketsByProject,
  updateTicketsFeature,
  updateTicketFeature
} from '@/features/tickets/tickets.repo'

export async function getTicketsByProject(
  projectId: string,
  organizationId: string | undefined,
  filters: TicketFilters
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  if (filters.featureId !== undefined) {
    const feature = await findFeatureById(filters.featureId)

    if (
      !feature ||
      feature.project.organizationId !== organizationId ||
      feature.projectId !== projectId
    ) {
      throw new NotFoundError('Feature not found.')
    }
  }

  const result = await findTicketsByProject(projectId, filters)
  const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / filters.limit)

  return {
    items: result.items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems: result.total,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1
    },
    search: filters.search ?? null,
    assignee: filters.assignee ?? null,
    sort: {
      by: filters.sortBy,
      order: filters.sortOrder
    }
  }
}

export async function assignTicketToFeature(
  ticketId: string,
  organizationId: string | undefined,
  input: AssignTicketFeatureInput
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const ticket = await findTicketById(ticketId)

  if (!ticket || ticket.project.organizationId !== organizationId) {
    throw new NotFoundError('Ticket not found.')
  }

  if (input.featureId === null) {
    return updateTicketFeature(ticketId, null)
  }

  const feature = await findFeatureById(input.featureId)

  if (
    !feature ||
    feature.project.organizationId !== organizationId ||
    feature.projectId !== ticket.projectId
  ) {
    throw new NotFoundError('Feature not found.')
  }

  return updateTicketFeature(ticketId, feature.id)
}

export async function assignTicketsToFeatureBulk(
  organizationId: string | undefined,
  input: BulkAssignTicketFeatureInput
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const uniqueTicketIds = Array.from(new Set(input.ticketIds))
  const tickets = await findTicketsByIds(uniqueTicketIds)

  if (tickets.length !== uniqueTicketIds.length) {
    throw new NotFoundError('One or more tickets were not found.')
  }

  const invalidTicket = tickets.find(
    (ticket) => ticket.project.organizationId !== organizationId
  )

  if (invalidTicket) {
    throw new NotFoundError('One or more tickets were not found.')
  }

  const ticketProjectIds = Array.from(new Set(tickets.map((ticket) => ticket.projectId)))

  if (ticketProjectIds.length !== 1) {
    throw new ValidationError(
      'Bulk ticket assignment requires all tickets to belong to the same project.'
    )
  }

  const [projectId] = ticketProjectIds

  if (input.featureId !== null) {
    const feature = await findFeatureById(input.featureId)

    if (
      !feature ||
      feature.project.organizationId !== organizationId ||
      feature.projectId !== projectId
    ) {
      throw new NotFoundError('Feature not found.')
    }
  }

  const updatedTickets = await updateTicketsFeature(uniqueTicketIds, input.featureId)

  return {
    totalUpdated: updatedTickets.length,
    projectId,
    featureId: input.featureId,
    tickets: updatedTickets
  }
}
