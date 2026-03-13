import { timingSafeEqual } from 'crypto'

import { UnauthorizedError } from '@/core/errors/unauthorized.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import {
  findClientAccessValidationRecords,
  findClientDashboardProject,
  updateClientAccessLastViewedAt
} from '@/features/client/client.repo'
import { TicketStatus, type SyncStatus } from '@prisma/client'

type ClientAccessMatch = {
  id: string
  projectId: string
}

type ClientFeatureStatus =
  | 'NO_WORK_LOGGED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

const COMPLETED_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.APPROVED,
  TicketStatus.RELEASED
]

const RECENT_ACTIVITY_MESSAGE_BY_STATUS: Record<SyncStatus, string> = {
  SUCCESS: 'Project data was synced successfully.',
  FAILED: 'Project sync failed.',
  RATE_LIMITED: 'Project sync was rate limited.'
}

const compareTokenSafely = (
  providedToken: string,
  storedToken: string
): boolean => {
  const providedTokenBuffer = Buffer.from(providedToken)
  const storedTokenBuffer = Buffer.from(storedToken)

  if (providedTokenBuffer.length !== storedTokenBuffer.length) {
    return false
  }

  return timingSafeEqual(providedTokenBuffer, storedTokenBuffer)
}

const calculatePercentage = (
  completedCount: number,
  totalCount: number
): number => {
  if (totalCount === 0) {
    return 0
  }

  return Math.round((completedCount / totalCount) * 100)
}

const getFeatureStatus = (
  totalTickets: number,
  completedTickets: number
): ClientFeatureStatus => {
  if (totalTickets === 0) {
    return 'NO_WORK_LOGGED'
  }

  if (completedTickets === 0) {
    return 'NOT_STARTED'
  }

  if (completedTickets === totalTickets) {
    return 'COMPLETED'
  }

  return 'IN_PROGRESS'
}

export const getClientAccessByToken = async (
  token: string
): Promise<ClientAccessMatch> => {
  const clientAccessRecords = await findClientAccessValidationRecords()

  const matchedClientAccess = clientAccessRecords.find((clientAccess) => {
    return compareTokenSafely(token, clientAccess.token)
  })

  if (!matchedClientAccess) {
    throw new UnauthorizedError('Invalid client access token.')
  }

  return {
    id: matchedClientAccess.id,
    projectId: matchedClientAccess.projectId
  }
}

export const getClientDashboardData = async (
  clientAccessId: string,
  projectId: string
) => {
  const project = await findClientDashboardProject(projectId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  const features = project.features.map((feature) => {
    const activeTickets = feature.tickets.filter((ticket) => {
      return ticket.isMissingFromSource === false
    })

    const totalTickets = activeTickets.length
    const completedTickets = activeTickets.filter((ticket) => {
      return COMPLETED_TICKET_STATUSES.includes(ticket.devtrackStatus)
    }).length

    const progress = calculatePercentage(completedTickets, totalTickets)

    return {
      name: feature.name,
      progress,
      status: getFeatureStatus(totalTickets, completedTickets),
      totalTickets,
      completedTickets
    }
  })

  const overallProgress =
    features.length === 0
      ? 0
      : Math.round(
          features.reduce((total, feature) => {
            return total + feature.progress
          }, 0) / features.length
        )

  const recentActivity = project.syncLogs.map((syncLog) => {
    return {
      status: syncLog.status,
      message: RECENT_ACTIVITY_MESSAGE_BY_STATUS[syncLog.status],
      ticketsAdded: syncLog.ticketsAdded,
      ticketsUpdated: syncLog.ticketsUpdated,
      happenedAt: syncLog.createdAt
    }
  })

  await updateClientAccessLastViewedAt(clientAccessId, new Date())

  return {
    projectName: project.name,
    overallProgress,
    lastSyncedAt: project.lastSyncedAt,
    features,
    recentActivity
  }
}
