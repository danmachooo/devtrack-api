import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import type {
  ConnectNotionInput,
  DefaultStatusMappingParams,
  ProjectNotionIdentifier,
  SaveStatusMappingInput,
  TestNotionConnectionInput
} from '@/features/notion/notion.schema'
import {
  connectNotion,
  enqueueManualSync,
  getDefaultStatusMappingService,
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

export const getDefaultStatusMappingController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: DefaultStatusMappingParams = http.req.validatedParams
    const result = await getDefaultStatusMappingService(
      project.id,
      http.req.user.organizationId
    )

    return sendResponse(
      http.res,
      200,
      'Default Notion status mapping generated successfully.',
      result
    )
  }
)

export const enqueueManualSyncController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: ProjectNotionIdentifier = http.req.validatedParams
    const result = await enqueueManualSync(
      project.id,
      http.req.user.organizationId
    )

    const statusCode = result.alreadyQueued ? 200 : 202
    const message = result.alreadyQueued
      ? 'Project sync already scheduled.'
      : 'Project sync scheduled successfully.'

    return sendResponse(http.res, statusCode, message, result)
  }
)
