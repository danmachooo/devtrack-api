import { NotFoundError } from '@/core/errors/not-found.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { findProjectById } from '@/features/projects/projects.repo'
import {
  deleteFeatureRecord,
  findFeatureById,
  findFeaturesByProject,
  findLastFeatureByOrder,
  insertFeature,
  updateFeatureRecord
} from '@/features/features/features.repo'
import type {
  CreateFeatureInput,
  UpdateFeatureInput
} from '@/features/features/feature.schema'

export async function listFeatures(
  projectId: string,
  organizationId: string | undefined
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) throw new NotFoundError('Project not found.')

  const features = await findFeaturesByProject(projectId)
  return features
}

export async function createFeature(
  projectId: string,
  organizationId: string | undefined,
  input: CreateFeatureInput
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) throw new NotFoundError('Project not found.')

  const lastFeature = await findLastFeatureByOrder(projectId)
  const nextOrder = lastFeature ? lastFeature.order + 1 : 0
  const featureOrder = input.order ?? nextOrder

  const feature = await insertFeature(projectId, input, featureOrder)
  return feature
}

export async function updateFeature(
  featureId: string,
  organizationId: string | undefined,
  input: UpdateFeatureInput
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const feature = await findFeatureById(featureId)

  if (!feature || feature.project.organizationId !== organizationId) {
    throw new NotFoundError('Feature not found.')
  }

  const updatedFeature = await updateFeatureRecord(featureId, input)
  return updatedFeature
}

export async function deleteFeature(
  featureId: string,
  organizationId: string | undefined
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const feature = await findFeatureById(featureId)

  if (!feature || feature.project.organizationId !== organizationId) {
    throw new NotFoundError('Feature not found.')
  }

  await deleteFeatureRecord(featureId)
}
