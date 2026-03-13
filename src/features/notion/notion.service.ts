import { TicketStatus, type Prisma, type Project } from '@prisma/client'

import { AppError } from '@/core/errors/app.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { mapNotionStatusToTicketStatus } from '@/features/notion/notion.mapper'
import type {
  ConnectNotionInput,
  SaveStatusMappingInput,
  TestNotionConnectionInput
} from '@/features/notion/notion.schema'
import {
  findProjectById,
  updateProjectNotionConnection,
  updateProjectStatusMapping
} from '@/features/projects/projects.repo'
import { decrypt, encrypt } from '@/lib/encryption'
import {
  listSearchDataSources,
  queryDataSourcePages,
  retrieveDatabase,
  retrieveDataSource,
  type NotionDatabaseSummary,
  type NotionDataSourceSummary,
  type NotionPage
} from '@/lib/notion'

type NotionConnectionResponse = {
  projectId: string
  notionDatabaseId: string
  databaseTitle: string
  databaseUrl: string
  dataSources: Array<{
    id: string
    name: string
  }>
}

type FetchTicketsResponse = Array<{
  notionPageId: string
  title: string
  notionStatus: string
  devtrackStatus: TicketStatus
  assigneeName: string | null
  notionUpdatedAt: Date
}>

const getPlainText = (value: Array<{ plain_text: string }> | undefined): string => {
  if (!value || value.length === 0) {
    return ''
  }

  return value.map((item) => item.plain_text).join('')
}

const getProjectOrThrow = async (
  projectId: string,
  organizationId: string | undefined
): Promise<Project> => {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  return project
}

const getPrimaryDataSourceId = (database: NotionDatabaseSummary): string => {
  if (database.data_sources.length === 0) {
    throw new AppError(400, 'Notion database has no accessible data sources.')
  }

  const primaryDataSource = database.data_sources[0] as {
    id: string
    name: string
  }

  return primaryDataSource.id
}

const mapDatabaseResponse = (
  projectId: string,
  database: NotionDatabaseSummary
): NotionConnectionResponse => {
  return {
    projectId,
    notionDatabaseId: database.id,
    databaseTitle: getPlainText(database.title),
    databaseUrl: database.url,
    dataSources: database.data_sources
  }
}

const parseStatusMapping = (
  statusMapping: Prisma.JsonValue | null
): Record<string, TicketStatus> => {
  if (!statusMapping || typeof statusMapping !== 'object' || Array.isArray(statusMapping)) {
    return {}
  }

  const parsedStatusMapping: Record<string, TicketStatus> = {}

  for (const [notionStatus, value] of Object.entries(statusMapping)) {
    if (typeof value === 'string' && value in TicketStatus) {
      parsedStatusMapping[notionStatus] = value as TicketStatus
    }
  }

  return parsedStatusMapping
}

const getStoredNotionToken = (project: Project): string => {
  if (!project.notionToken) {
    throw new AppError(400, 'Notion is not connected for this project.')
  }

  return decrypt(project.notionToken)
}

const getStoredDatabaseId = (project: Project): string => {
  if (!project.notionDatabaseId) {
    throw new AppError(400, 'No Notion database is configured for this project.')
  }

  return project.notionDatabaseId
}

const isDatabaseParent = (
  parent: {
    type: string
    [key: string]: unknown
  }
): parent is {
  type: 'database_id'
  database_id: string
} => {
  return parent.type === 'database_id' && typeof parent.database_id === 'string'
}

const hasDatabaseParent = (
  dataSource: NotionDataSourceSummary
): dataSource is NotionDataSourceSummary & {
  parent: {
    type: 'database_id'
    database_id: string
  }
} => {
  return isDatabaseParent(dataSource.parent)
}

const getTitleFromPage = (page: NotionPage): string => {
  const titleProperty = Object.values(page.properties).find(
    (property) => property.type === 'title'
  )

  if (!titleProperty?.title) {
    return 'Untitled'
  }

  const title = getPlainText(titleProperty.title)
  return title || 'Untitled'
}

const getStatusFromPage = (page: NotionPage): string => {
  const statusProperty = Object.values(page.properties).find(
    (property) => property.type === 'status' || property.type === 'select'
  )

  if (!statusProperty) {
    return 'TODO'
  }

  if (statusProperty.status?.name) {
    return statusProperty.status.name
  }

  if (statusProperty.select?.name) {
    return statusProperty.select.name
  }

  return 'TODO'
}

const getAssigneeFromPage = (page: NotionPage): string | null => {
  const peopleProperty = Object.values(page.properties).find(
    (property) => property.type === 'people'
  )

  if (!peopleProperty?.people || peopleProperty.people.length === 0) {
    return null
  }

  const names = peopleProperty.people
    .map((person) => person.name)
    .filter((name): name is string => Boolean(name))

  return names.length > 0 ? names.join(', ') : null
}

export const connectNotion = async (
  projectId: string,
  organizationId: string | undefined,
  input: ConnectNotionInput
): Promise<NotionConnectionResponse> => {
  const project = await getProjectOrThrow(projectId, organizationId)
  const database = await retrieveDatabase(input.notionToken, input.databaseId)

  getPrimaryDataSourceId(database)

  await updateProjectNotionConnection(
    project.id,
    encrypt(input.notionToken),
    database.id
  )

  return mapDatabaseResponse(project.id, database)
}

export const testConnection = async (
  projectId: string,
  organizationId: string | undefined,
  input: TestNotionConnectionInput
): Promise<NotionConnectionResponse> => {
  const project = await getProjectOrThrow(projectId, organizationId)
  const database = await retrieveDatabase(input.notionToken, input.databaseId)

  getPrimaryDataSourceId(database)

  return mapDatabaseResponse(project.id, database)
}

export const listDatabases = async (
  projectId: string,
  organizationId: string | undefined
): Promise<NotionConnectionResponse[]> => {
  const project = await getProjectOrThrow(projectId, organizationId)
  const notionToken = getStoredNotionToken(project)
  const dataSources = await listSearchDataSources(notionToken)
  const databaseIds = Array.from(
    new Set(
      dataSources
        .filter(hasDatabaseParent)
        .map((dataSource) => dataSource.parent.database_id)
    )
  )

  const databases = await Promise.all(
    databaseIds.map(async (databaseId) => {
      const database = await retrieveDatabase(notionToken, databaseId)
      return mapDatabaseResponse(project.id, database)
    })
  )

  return databases
}

export const saveStatusMapping = async (
  projectId: string,
  organizationId: string | undefined,
  input: SaveStatusMappingInput
) => {
  const project = await getProjectOrThrow(projectId, organizationId)

  if (!project.notionToken || !project.notionDatabaseId) {
    throw new AppError(400, 'Connect Notion before saving a status mapping.')
  }

  const updatedProject = await updateProjectStatusMapping(
    project.id,
    input.statusMapping
  )

  return {
    projectId: updatedProject.id,
    statusMapping: parseStatusMapping(updatedProject.statusMapping)
  }
}

export const fetchTickets = async (
  projectId: string,
  organizationId: string | undefined
): Promise<FetchTicketsResponse> => {
  const project = await getProjectOrThrow(projectId, organizationId)
  const notionToken = getStoredNotionToken(project)
  const databaseId = getStoredDatabaseId(project)
  const database = await retrieveDatabase(notionToken, databaseId)
  const dataSourceId = getPrimaryDataSourceId(database)

  await retrieveDataSource(notionToken, dataSourceId)

  const pages = await queryDataSourcePages(notionToken, dataSourceId)
  const statusMapping = parseStatusMapping(project.statusMapping)

  return pages.map((page) => {
    const notionStatus = getStatusFromPage(page)

    return {
      notionPageId: page.id,
      title: getTitleFromPage(page),
      notionStatus,
      devtrackStatus: mapNotionStatusToTicketStatus(
        notionStatus,
        statusMapping
      ),
      assigneeName: getAssigneeFromPage(page),
      notionUpdatedAt: new Date(page.last_edited_time)
    }
  })
}
