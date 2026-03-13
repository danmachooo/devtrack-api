import { NotFoundError } from '@/core/errors/not-found.error'
import { findFeatureById, findFeaturesByProject } from '@/features/features/features.repo'
import {
  findProjectRecordById
} from '@/features/projects/projects.repo'
import {
  countCompletedTicketsByFeature,
  countTicketsByFeature
} from '@/features/tickets/tickets.repo'

const calculatePercentage = (
  completedCount: number,
  totalCount: number
): number => {
  if (totalCount === 0) {
    return 0
  }

  return Math.round((completedCount / totalCount) * 100)
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
