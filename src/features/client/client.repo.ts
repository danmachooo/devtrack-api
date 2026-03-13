import { prisma } from '@/lib/prisma'
import { type Prisma } from '@prisma/client'

const clientAccessValidationSelect = {
  id: true,
  token: true,
  projectId: true
} satisfies Prisma.ClientAccessSelect

const clientDashboardProjectSelect = {
  id: true,
  name: true,
  lastSyncedAt: true,
  features: {
    orderBy: {
      order: 'asc'
    },
    select: {
      id: true,
      name: true,
      order: true,
      tickets: {
        select: {
          devtrackStatus: true,
          isMissingFromSource: true
        }
      }
    }
  },
  syncLogs: {
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    select: {
      status: true,
      ticketsAdded: true,
      ticketsUpdated: true,
      errorMessage: true,
      createdAt: true
    }
  }
} satisfies Prisma.ProjectSelect

export const findClientAccessValidationRecords = async () => {
  return prisma.clientAccess.findMany({
    select: clientAccessValidationSelect
  })
}

export const findClientDashboardProject = async (projectId: string) => {
  return prisma.project.findUnique({
    where: {
      id: projectId
    },
    select: clientDashboardProjectSelect
  })
}

export const updateClientAccessLastViewedAt = async (
  clientAccessId: string,
  lastViewedAt: Date
) => {
  return prisma.clientAccess.update({
    where: {
      id: clientAccessId
    },
    data: {
      lastViewedAt
    }
  })
}
