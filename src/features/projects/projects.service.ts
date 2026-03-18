import { NotFoundError } from '@/core/errors/not-found.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { appConfig } from '@/config/config'
import {
  buildProjectProgressSummary,
  type ProjectProgressSummary
} from '@/features/progress/progress.service'
import {
  deleteProjectRecord,
  findProjectById,
  findProjectClientAccessById,
  findProjectByIdOrThrow,
  findProjectProgressSummaryRecords,
  findProjects,
  insertProject,
  type SafeProject,
  type SafeProjectWithOrderedFeatures,
  updateProjectRecord
} from '@/features/projects/projects.repo'
import type {
  CreateProjectInput,
  UpdateProjectInput
} from '@/features/projects/project.schema'

type SafeProjectWithProgressSummary = SafeProject & {
  progressSummary: ProjectProgressSummary
}

export async function createProject(
  input: CreateProjectInput,
  userId: string,
  organizationId?: string
): Promise<SafeProject> {
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
): Promise<SafeProject> {
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
): Promise<SafeProjectWithProgressSummary[] | null> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const projects = await findProjects(organizationId)
  const projectIds = projects.map((project) => {
    return project.id
  })
  const progressRecords = await findProjectProgressSummaryRecords(projectIds)

  const featuresByProjectId = new Map<string, typeof progressRecords.features>()
  const ticketsByProjectId = new Map<string, typeof progressRecords.tickets>()

  for (const feature of progressRecords.features) {
    const projectFeatures = featuresByProjectId.get(feature.projectId) ?? []
    projectFeatures.push(feature)
    featuresByProjectId.set(feature.projectId, projectFeatures)
  }

  for (const ticket of progressRecords.tickets) {
    const projectTickets = ticketsByProjectId.get(ticket.projectId) ?? []
    projectTickets.push(ticket)
    ticketsByProjectId.set(ticket.projectId, projectTickets)
  }

  return projects.map((project) => {
    const projectFeatures = featuresByProjectId.get(project.id) ?? []
    const projectTickets = ticketsByProjectId.get(project.id) ?? []

    return {
      ...project,
      progressSummary: buildProjectProgressSummary(projectFeatures, projectTickets)
    }
  })
}

export async function listProjectById(
  projectId: string,
  organizationId: string | undefined
): Promise<SafeProjectWithOrderedFeatures> {
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
): Promise<SafeProjectWithOrderedFeatures | null> {
  return await findProjectByIdOrThrow(projectId, organizationId)
}

const getNormalizedFrontendUrl = (): string => {
  return appConfig.frontend.url.endsWith('/')
    ? appConfig.frontend.url.slice(0, -1)
    : appConfig.frontend.url
}

export async function getProjectClientAccessLink(
  projectId: string,
  organizationId: string | undefined
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectClientAccessById(projectId, organizationId)

  if (!project?.clientAccess) {
    throw new NotFoundError('Project client access not found.')
  }

  const clientAccessLink = `${getNormalizedFrontendUrl()}/client/${project.clientAccess.token}`

  return {
    projectId: project.id,
    clientAccessLink,
    lastViewedAt: project.clientAccess.lastViewedAt
  }
}
