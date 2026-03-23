import {
  isFullDatabase,
  isFullDataSource,
  type DataSourceObjectResponse,
  type DatabaseObjectResponse
} from '@notionhq/client'

import { createNotionClient } from '@/lib/notion'
import { prisma } from '@/lib/prisma'
import {
  type Project,
  type SyncStatus,
  type TicketStatus
} from '@prisma/client'

export interface SyncedTicketRecord {
  notionPageId: string
  title: string
  notionStatus: string
  devtrackStatus: TicketStatus
  assigneeName: string | null
  moduleName: string | null
  featureId?: string | null
  notionUpdatedAt: Date
}

type ProjectSyncContext = Pick<
  Project,
  | 'id'
  | 'notionToken'
  | 'notionDatabaseId'
  | 'statusMapping'
  | 'syncInterval'
  | 'lastSyncedAt'
>

type ConnectedProjectSchedule = Pick<Project, 'id' | 'syncInterval'>

interface NotionPropertyOption {
  name?: string
}

interface NotionPropertyConfiguration {
  type?: string
  status?: {
    options?: NotionPropertyOption[]
  }
  select?: {
    options?: NotionPropertyOption[]
  }
  multi_select?: {
    options?: NotionPropertyOption[]
  }
}

const STATUS_PROPERTY_NAME = 'STATUS'

const getStatusPropertyOptions = (
  property: NotionPropertyConfiguration
): string[] => {
  if (property.type === 'status') {
    return (
      property.status?.options
        ?.map((option) => option.name?.trim() ?? '')
        .filter((optionName) => optionName.length > 0) ?? []
    )
  }

  if (property.type === 'select') {
    return (
      property.select?.options
        ?.map((option) => option.name?.trim() ?? '')
        .filter((optionName) => optionName.length > 0) ?? []
    )
  }

  if (property.type === 'multi_select') {
    return (
      property.multi_select?.options
        ?.map((option) => option.name?.trim() ?? '')
        .filter((optionName) => optionName.length > 0) ?? []
    )
  }

  return []
}

const findStatusPropertyOptions = (
  properties: DataSourceObjectResponse['properties']
): string[] => {
  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    const property = propertyValue as NotionPropertyConfiguration
    const normalizedPropertyName = propertyName.trim().toUpperCase()
    const propertyOptions = getStatusPropertyOptions(property)

    if (
      propertyOptions.length > 0 &&
      (normalizedPropertyName === STATUS_PROPERTY_NAME ||
        property.type === 'status' ||
        property.type === 'select' ||
        property.type === 'multi_select')
    ) {
      return propertyOptions
    }
  }

  return []
}

export const getNotionDatabaseSchema = async (
  databaseId: string,
  notionToken: string
): Promise<string[]> => {
  const notion = createNotionClient(notionToken)
  const database = await notion.databases.retrieve({
    database_id: databaseId
  })

  if (!isFullDatabase(database) || database.data_sources.length === 0) {
    return []
  }

  const primaryDataSource = database.data_sources[0]
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: primaryDataSource.id
  })

  if (!isFullDataSource(dataSource)) {
    return []
  }

  return findStatusPropertyOptions(dataSource.properties)
}

export const findProjectSyncContext = async (
  projectId: string
): Promise<ProjectSyncContext | null> => {
  return prisma.project.findUnique({
    where: {
      id: projectId
    },
    select: {
      id: true,
      notionToken: true,
      notionDatabaseId: true,
      statusMapping: true,
      syncInterval: true,
      lastSyncedAt: true
    }
  })
}

export const findConnectedProjectsForScheduling = async (): Promise<
  ConnectedProjectSchedule[]
> => {
  return prisma.project.findMany({
    where: {
      notionToken: {
        not: null
      },
      notionDatabaseId: {
        not: null
      }
    },
    select: {
      id: true,
      syncInterval: true
    }
  })
}

export const persistTicketSync = async (
  projectId: string,
  tickets: SyncedTicketRecord[],
  syncedAt: Date
): Promise<{
  ticketsAdded: number
  ticketsUpdated: number
  ticketsMarkedMissing: number
}> => {
  const getUpdatedFeatureId = (
    existingTicketProjectId: string,
    ticket: SyncedTicketRecord
  ): string | null | undefined => {
    if (existingTicketProjectId !== projectId) {
      return ticket.featureId ?? null
    }

    if (ticket.moduleName === null) {
      return undefined
    }

    return ticket.featureId ?? null
  }

  return prisma.$transaction(async (tx) => {
    let ticketsAdded = 0
    let ticketsUpdated = 0

    for (const ticket of tickets) {
      const existingTicket = await tx.ticket.findUnique({
        where: {
          notionPageId: ticket.notionPageId
        },
        select: {
          id: true,
          projectId: true
        }
      })

      if (!existingTicket) {
        await tx.ticket.create({
          data: {
            notionPageId: ticket.notionPageId,
            title: ticket.title,
            notionStatus: ticket.notionStatus,
            devtrackStatus: ticket.devtrackStatus,
            assigneeName: ticket.assigneeName,
            notionUpdatedAt: ticket.notionUpdatedAt,
            syncedAt,
            projectId,
            featureId: ticket.featureId ?? null,
            isMissingFromSource: false,
            missingFromSourceAt: null
          }
        })

        ticketsAdded += 1
        continue
      }

      await tx.ticket.update({
        where: {
          notionPageId: ticket.notionPageId
        },
        data: {
          title: ticket.title,
          notionStatus: ticket.notionStatus,
          devtrackStatus: ticket.devtrackStatus,
          assigneeName: ticket.assigneeName,
          notionUpdatedAt: ticket.notionUpdatedAt,
          syncedAt,
          projectId,
          featureId: getUpdatedFeatureId(existingTicket.projectId, ticket),
          isMissingFromSource: false,
          missingFromSourceAt: null
        }
      })

      ticketsUpdated += 1
    }

    const notionPageIds = tickets.map((ticket) => ticket.notionPageId)

    const missingTickets = await tx.ticket.updateMany({
      where: {
        projectId,
        ...(notionPageIds.length > 0
          ? {
              notionPageId: {
                notIn: notionPageIds
              }
            }
          : {}),
        isMissingFromSource: false
      },
      data: {
        isMissingFromSource: true,
        missingFromSourceAt: syncedAt,
        syncedAt
      }
    })

    await tx.project.update({
      where: {
        id: projectId
      },
      data: {
        lastSyncedAt: syncedAt
      }
    })

    return {
      ticketsAdded,
      ticketsUpdated,
      ticketsMarkedMissing: missingTickets.count
    }
  })
}

export const insertSyncLog = async (
  projectId: string,
  status: SyncStatus,
  ticketsAdded: number,
  ticketsUpdated: number,
  errorMessage?: string
) => {
  return prisma.syncLog.create({
    data: {
      projectId,
      status,
      ticketsAdded,
      ticketsUpdated,
      errorMessage
    }
  })
}
