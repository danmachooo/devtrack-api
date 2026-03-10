import { NotFoundError } from '@/core/errors/not-found-error'
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
  userId: string
): Promise<Project> {
  const project = await insertProject(input, userId)
  return project
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const existing = await findProjectById(projectId, userId)

  if (!existing) throw new NotFoundError('Project not found.')

  const project = await updateProjectRecord(projectId, input)
  return project
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteProjectRecord(projectId)
}

export async function listProjects(userId: string): Promise<Project[] | null> {
  const projects = await findProjects(userId)
  return projects
}

export async function listProjectById(
  projectId: string,
  userId: string
): Promise<Project> {
  const project = await findProjectById(projectId, userId)

  if (!project) throw new NotFoundError('Project not found.')
  return project
}

export async function listProjectByIdOrThrow(
  projectId: string,
  userId: string
): Promise<Project | null> {
  return await findProjectByIdOrThrow(projectId, userId)
}
