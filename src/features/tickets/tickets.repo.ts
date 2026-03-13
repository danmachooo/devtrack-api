import { prisma } from '@/lib/prisma'
import type { TicketFilters } from '@/features/tickets/ticket.schema'
import { TicketStatus, type Prisma } from '@prisma/client'

const ticketRelations = {
  feature: {
    select: {
      id: true,
      name: true,
      order: true
    }
  }
} satisfies Prisma.TicketInclude

export async function findTicketById(ticketId: string) {
  return prisma.ticket.findUnique({
    where: {
      id: ticketId
    },
    include: {
      project: {
        select: {
          id: true,
          organizationId: true
        }
      },
      feature: {
        select: {
          id: true,
          projectId: true
        }
      }
    }
  })
}

export async function findTicketsByProject(
  projectId: string,
  filters: TicketFilters
) {
  return prisma.ticket.findMany({
    where: {
      projectId,
      ...(filters.showMissing === true ? {} : { isMissingFromSource: false }),
      ...(filters.status !== undefined
        ? { devtrackStatus: filters.status }
        : {}),
      ...(filters.unassigned === true ? { featureId: null } : {}),
      ...(filters.featureId !== undefined
        ? { featureId: filters.featureId }
        : {})
    },
    orderBy: [
      {
        syncedAt: 'desc'
      },
      {
        createdAt: 'desc'
      }
    ],
    include: ticketRelations
  })
}

export async function updateTicketFeature(ticketId: string, featureId: string | null) {
  return prisma.ticket.update({
    where: {
      id: ticketId
    },
    data: {
      featureId
    },
    include: ticketRelations
  })
}

export async function countTicketsByFeature(featureId: string) {
  return prisma.ticket.count({
    where: {
      featureId,
      isMissingFromSource: false
    }
  })
}

export async function countCompletedTicketsByFeature(featureId: string) {
  return prisma.ticket.count({
    where: {
      featureId,
      isMissingFromSource: false,
      devtrackStatus: {
        in: [TicketStatus.APPROVED, TicketStatus.RELEASED]
      }
    }
  })
}
