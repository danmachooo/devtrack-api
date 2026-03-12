import { asyncHandler } from '@/core/middleware/async-handler'
import {
  createProject,
  deleteProject,
  listProjectById,
  listProjects,
  updateProject
} from '@/features/projects/projects.service'
import type {
  CreateProjectInput,
  ProjectIdentifier,
  UpdateProjectInput
} from '@/features/projects/project.schema'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'

export const createProjectController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const body: CreateProjectInput = http.req.validatedBody

    const result = await createProject(
      body,
      http.req.user.id,
      http.req.user.organizationId
    )

    return sendResponse(http.res, 201, 'Project has been created.', result)
  }
)

export const updateProjectController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const body: UpdateProjectInput = http.req.validatedBody
    const project: ProjectIdentifier = http.req.validatedParams

    const result = await updateProject(
      project.id,
      http.req.user.organizationId,
      body
    )

    return sendResponse(http.res, 200, 'Project has been updated.', result)
  }
)

export const getProjectsController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const result = await listProjects(http.req.user.organizationId)

    return sendResponse(http.res, 200, 'Projects has been found.', result)
  }
)

export const getProjectByIdController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectIdentifier = http.req.validatedParams
    const result = await listProjectById(project.id, http.req.user.organizationId)

    return sendResponse(
      http.res,
      200,
      `Project #${result.id} has been found.`,
      result
    )
  }
)

export const deleteProjectController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectIdentifier = http.req.validatedParams

    await deleteProject(project.id, http.req.user.organizationId)
    return sendResponse(http.res, 200, 'Project has been deleted.')
  }
)
