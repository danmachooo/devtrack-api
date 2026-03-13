import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import {
  findFeatureById
} from '@/features/features/features.repo'
import { findProjectById } from '@/features/projects/projects.repo'
import type {
  AssignTicketFeatureInput,
  TicketFilters
} from '@/features/tickets/ticket.schema'
import {
  findTicketById,
  findTicketsByProject,
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

  return findTicketsByProject(projectId, filters)
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
