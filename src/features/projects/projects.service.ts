import { NotFoundError } from '@/core/errors/not-found.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import {
  deleteProjectRecord,
  findProjectById,
  findProjectByIdOrThrow,
  findProjects,
  insertProject,
  updateProjectRecord
} from '@/features/projects/projects.repo'
import type {
  CreateProjectInput,
  UpdateProjectInput
} from '@/features/projects/project.schema'
import type { Project } from '@prisma/client'

export async function createProject(
  input: CreateProjectInput,
  userId: string,
  organizationId?: string
): Promise<Project> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await insertProject(input, userId, organizationId)
  return project
}

export async function updateProject(
  projectId: string,
  organizationId: string | undefined,
  input: UpdateProjectInput
): Promise<Project> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const existing = await findProjectById(projectId, organizationId)

  if (!existing) throw new NotFoundError('Project not found.')

  const project = await updateProjectRecord(projectId, input)
  return project
}

export async function deleteProject(
  projectId: string,
  organizationId: string | undefined
): Promise<void> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const existing = await findProjectById(projectId, organizationId)

  if (!existing) throw new NotFoundError('Project not found.')

  await deleteProjectRecord(projectId, organizationId)
}

export async function listProjects(
  organizationId: string | undefined
): Promise<Project[] | null> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const projects = await findProjects(organizationId)
  return projects
}

export async function listProjectById(
  projectId: string,
  organizationId: string | undefined
): Promise<Project> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) throw new NotFoundError('Project not found.')
  return project
}

export async function listProjectByIdOrThrow(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  return await findProjectByIdOrThrow(projectId, organizationId)
}
