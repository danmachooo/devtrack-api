import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const syncLogSelect = {
  id: true,
  status: true,
  ticketsAdded: true,
  ticketsUpdated: true,
  errorMessage: true,
  createdAt: true
} satisfies Prisma.SyncLogSelect

export type SafeSyncLog = Prisma.SyncLogGetPayload<{
  select: typeof syncLogSelect
}>

export async function findSyncLogsByProject(
  projectId: string,
  limit: number
): Promise<SafeSyncLog[]> {
  return prisma.syncLog.findMany({
    where: {
      projectId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    select: syncLogSelect
  })
}
