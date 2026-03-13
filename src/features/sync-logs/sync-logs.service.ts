import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { findProjectById } from '@/features/projects/projects.repo'
import {
  findSyncLogsByProject,
  type SafeSyncLog
} from '@/features/sync-logs/sync-logs.repo'

export async function listSyncLogs(
  projectId: string,
  organizationId: string | undefined,
  limit: number
): Promise<SafeSyncLog[]> {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  return findSyncLogsByProject(projectId, limit)
}
