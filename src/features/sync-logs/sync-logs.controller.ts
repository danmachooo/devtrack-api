import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import {
  listSyncLogs
} from '@/features/sync-logs/sync-logs.service'
import type {
  SyncLogsProjectIdentifier,
  SyncLogsQuery
} from '@/features/sync-logs/sync-logs.schema'

export const getSyncLogsController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: SyncLogsProjectIdentifier = http.req.validatedParams
    const query: SyncLogsQuery = http.req.validatedQuery

    const result = await listSyncLogs(
      project.id,
      http.req.user.organizationId,
      query.limit
    )

    return sendResponse(http.res, 200, 'Sync logs have been found.', result)
  }
)
