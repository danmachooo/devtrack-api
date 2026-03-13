import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import type {
  ConnectNotionInput,
  ProjectNotionIdentifier,
  SaveStatusMappingInput,
  TestNotionConnectionInput
} from '@/features/notion/notion.schema'
import {
  connectNotion,
  listDatabases,
  saveStatusMapping,
  testConnection
} from '@/features/notion/notion.service'

export const connectNotionController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectNotionIdentifier = http.req.validatedParams
    const body: ConnectNotionInput = http.req.validatedBody
    const result = await connectNotion(project.id, http.req.user.organizationId, body)

    return sendResponse(http.res, 200, 'Notion has been connected.', result)
  }
)

export const testNotionConnectionController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectNotionIdentifier = http.req.validatedParams
    const body: TestNotionConnectionInput = http.req.validatedBody
    const result = await testConnection(
      project.id,
      http.req.user.organizationId,
      body
    )

    return sendResponse(
      http.res,
      200,
      'Notion connection has been verified.',
      result
    )
  }
)

export const listNotionDatabasesController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectNotionIdentifier = http.req.validatedParams
    const result = await listDatabases(project.id, http.req.user.organizationId)

    return sendResponse(
      http.res,
      200,
      'Notion databases have been found.',
      result
    )
  }
)

export const saveStatusMappingController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectNotionIdentifier = http.req.validatedParams
    const body: SaveStatusMappingInput = http.req.validatedBody
    const result = await saveStatusMapping(
      project.id,
      http.req.user.organizationId,
      body
    )

    return sendResponse(
      http.res,
      200,
      'Notion status mapping has been saved.',
      result
    )
  }
)
