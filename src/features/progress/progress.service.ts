import { NotFoundError } from '@/core/errors/not-found.error'
import { findFeatureById, findFeaturesByProject } from '@/features/features/features.repo'
import {
  findProjectRecordById
} from '@/features/projects/projects.repo'
import {
  countCompletedTicketsByFeature,
  countTicketsByFeature
} from '@/features/tickets/tickets.repo'
import { TicketStatus } from '@prisma/client'

export type ProgressFeatureStatus =
  | 'NO_WORK_LOGGED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export type ProjectProgressFeatureSummary = {
  featureId: string
  name: string
  order: number
  progress: number
  status: ProgressFeatureStatus
  totalTickets: number
  completedTickets: number
}

export type ProjectProgressSummary = {
  overallProgress: number
  assignedNonMissingTickets: number
  completedAssignedNonMissingTickets: number
  unassignedTickets: number
  missingTickets: number
  featuresWithProgress: number
  totalFeatures: number
  featureSummaries?: ProjectProgressFeatureSummary[]
}

type ProjectProgressSummaryFeatureInput = {
  id: string
  name: string
  order: number
}

type ProjectProgressSummaryTicketInput = {
  featureId: string | null
  isMissingFromSource: boolean
  devtrackStatus: TicketStatus
}

const COMPLETED_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.APPROVED,
  TicketStatus.RELEASED
]

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
): ProgressFeatureStatus => {
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

export const buildProjectProgressSummary = (
  features: ProjectProgressSummaryFeatureInput[],
  tickets: ProjectProgressSummaryTicketInput[]
): ProjectProgressSummary => {
  const ticketsByFeatureId = new Map<string, ProjectProgressSummaryTicketInput[]>()
  let assignedNonMissingTickets = 0
  let completedAssignedNonMissingTickets = 0
  let unassignedTickets = 0
  let missingTickets = 0

  for (const ticket of tickets) {
    if (ticket.isMissingFromSource) {
      missingTickets += 1
      continue
    }

    if (!ticket.featureId) {
      unassignedTickets += 1
      continue
    }

    assignedNonMissingTickets += 1

    if (COMPLETED_TICKET_STATUSES.includes(ticket.devtrackStatus)) {
      completedAssignedNonMissingTickets += 1
    }

    const featureTickets = ticketsByFeatureId.get(ticket.featureId) ?? []
    featureTickets.push(ticket)
    ticketsByFeatureId.set(ticket.featureId, featureTickets)
  }

  const allFeatureSummaries = [...features]
    .sort((left, right) => left.order - right.order)
    .map((feature) => {
      const featureTickets = ticketsByFeatureId.get(feature.id) ?? []
      const totalTickets = featureTickets.length
      const completedTickets = featureTickets.filter((ticket) => {
        return COMPLETED_TICKET_STATUSES.includes(ticket.devtrackStatus)
      }).length

      return {
        featureId: feature.id,
        name: feature.name,
        order: feature.order,
        progress: calculatePercentage(completedTickets, totalTickets),
        status: getFeatureStatus(totalTickets, completedTickets),
        totalTickets,
        completedTickets
      }
    })

  const overallProgress =
    allFeatureSummaries.length === 0
      ? 0
      : Math.round(
          allFeatureSummaries.reduce((total, featureSummary) => {
            return total + featureSummary.progress
          }, 0) / allFeatureSummaries.length
        )

  const featureSummaries = allFeatureSummaries.filter((featureSummary) => {
    return featureSummary.totalTickets > 0
  })

  return {
    overallProgress,
    assignedNonMissingTickets,
    completedAssignedNonMissingTickets,
    unassignedTickets,
    missingTickets,
    featuresWithProgress: featureSummaries.length,
    totalFeatures: features.length,
    featureSummaries
  }
}

export async function calculateFeatureProgress(featureId: string): Promise<number> {
  const feature = await findFeatureById(featureId)

  if (!feature) {
    throw new NotFoundError('Feature not found.')
  }

  const totalTickets = await countTicketsByFeature(featureId)

  if (totalTickets === 0) {
    return 0
  }

  const completedTickets = await countCompletedTicketsByFeature(featureId)
  return calculatePercentage(completedTickets, totalTickets)
}

export async function calculateProjectProgress(projectId: string): Promise<number> {
  const project = await findProjectRecordById(projectId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  const features = await findFeaturesByProject(projectId)

  if (features.length === 0) {
    return 0
  }

  const featureProgressList = await Promise.all(
    features.map(async (feature) => {
      return calculateFeatureProgress(feature.id)
    })
  )

  const totalProgress = featureProgressList.reduce((sum, progress) => {
    return sum + progress
  }, 0)

  return Math.round(totalProgress / features.length)
}
