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

const ticketSortByFieldMap = {
  syncedAt: 'syncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  title: 'title',
  devtrackStatus: 'devtrackStatus'
} as const

const getTicketWhereInput = (
  projectId: string,
  filters: TicketFilters
): Prisma.TicketWhereInput => {
  return {
    projectId,
    ...(filters.showMissing === true ? {} : { isMissingFromSource: false }),
    ...(filters.status !== undefined
      ? { devtrackStatus: filters.status }
      : {}),
    ...(filters.unassigned === true ? { featureId: null } : {}),
    ...(filters.featureId !== undefined
      ? { featureId: filters.featureId }
      : {}),
    ...(filters.search !== undefined
      ? {
          OR: [
            {
              title: {
                contains: filters.search,
                mode: 'insensitive'
              }
            },
            {
              assigneeName: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          ]
        }
      : {}),
    ...(filters.assignee !== undefined
      ? {
          assigneeName: {
            contains: filters.assignee,
            mode: 'insensitive'
          }
        }
      : {})
  }
}

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

export async function findTicketsByIds(ticketIds: string[]) {
  return prisma.ticket.findMany({
    where: {
      id: {
        in: ticketIds
      }
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
  const where = getTicketWhereInput(projectId, filters)
  const orderByField = ticketSortByFieldMap[filters.sortBy]
  const skip = (filters.page - 1) * filters.limit

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: [
        {
          [orderByField]: filters.sortOrder
        },
        {
          id: 'asc'
        }
      ],
      skip,
      take: filters.limit,
      include: ticketRelations
    }),
    prisma.ticket.count({
      where
    })
  ])

  return {
    items,
    total
  }
}

export async function updateTicketsFeature(ticketIds: string[], featureId: string | null) {
  await prisma.ticket.updateMany({
    where: {
      id: {
        in: ticketIds
      }
    },
    data: {
      featureId
    }
  })

  return prisma.ticket.findMany({
    where: {
      id: {
        in: ticketIds
      }
    },
    orderBy: [
      {
        updatedAt: 'desc'
      },
      {
        id: 'asc'
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
