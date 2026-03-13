import {
  APIErrorCode,
  ClientErrorCode,
  isFullDatabase,
  isFullDataSource,
  isFullPageOrDataSource,
  isNotionClientError,
  iteratePaginatedAPI,
  type DataSourceObjectResponse,
  type DatabaseObjectResponse,
  type PageObjectResponse,
  type RichTextItemResponse
} from '@notionhq/client'
import { TicketStatus, type Prisma, type Project } from '@prisma/client'

import { AppError } from '@/core/errors/app.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { UnauthorizedError } from '@/core/errors/unauthorized.error'
import { mapNotionStatusToTicketStatus } from '@/features/notion/notion.mapper'
import {
  findProjectSyncContext,
  type SyncedTicketRecord
} from '@/features/notion/notion.repo'
import type {
  ConnectNotionInput,
  SaveStatusMappingInput,
  TestNotionConnectionInput
} from '@/features/notion/notion.schema'
import {
  findProjectByIdWithSecrets,
  updateProjectNotionConnection,
  updateProjectStatusMapping
} from '@/features/projects/projects.repo'
import { decrypt, encrypt } from '@/lib/encryption'
import { createNotionClient } from '@/lib/notion'
import { enqueueProjectSync } from '@/workers/sync.queue'

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

type NotionRichText = {
  plain_text: string
}

type NotionDatabaseSummary = {
  id: string
  title: NotionRichText[]
  url: string
  data_sources: Array<{
    id: string
    name: string
  }>
}

type NotionDataSourceSummary = {
  object: 'data_source'
  id: string
  name: string
  parent: DataSourceObjectResponse['parent']
}

type NotionPage = PageObjectResponse

type NotionDataSource = Pick<DataSourceObjectResponse, 'id' | 'title' | 'properties'>

const DEFAULT_PAGE_SIZE = 100

const getPlainText = (value: Array<{ plain_text: string }> | undefined): string => {
  if (!value || value.length === 0) {
    return ''
  }

  return value.map((item) => item.plain_text).join('')
}

const mapNotionError = (error: unknown): never => {
  if (!isNotionClientError(error)) {
    throw error
  }

  switch (error.code) {
    case APIErrorCode.Unauthorized:
      throw new UnauthorizedError('Invalid Notion token.')
    case APIErrorCode.RestrictedResource:
      throw new ForbiddenError(
        'Notion integration does not have access to this resource.'
      )
    case APIErrorCode.ObjectNotFound:
      throw new NotFoundError('Notion resource not found.')
    case APIErrorCode.RateLimited:
      throw new AppError(429, 'Notion rate limit exceeded.')
    case APIErrorCode.ValidationError:
    case APIErrorCode.InvalidRequest:
    case APIErrorCode.InvalidRequestURL:
    case APIErrorCode.InvalidJSON:
      throw new AppError(400, error.message)
    case APIErrorCode.ConflictError:
      throw new AppError(409, error.message)
    case APIErrorCode.InternalServerError:
    case APIErrorCode.ServiceUnavailable:
    case ClientErrorCode.RequestTimeout:
    case ClientErrorCode.ResponseError:
      throw new AppError(502, 'Notion request failed.')
    default:
      throw new AppError(502, 'Notion request failed.')
  }
}

const mapRichText = (value: RichTextItemResponse[]): NotionRichText[] => {
  return value.map((item) => ({
    plain_text: item.plain_text
  }))
}

const mapDatabaseSummary = (
  database: DatabaseObjectResponse
): NotionDatabaseSummary => {
  return {
    id: database.id,
    title: mapRichText(database.title),
    url: database.url,
    data_sources: database.data_sources.map((dataSource) => ({
      id: dataSource.id,
      name: dataSource.name
    }))
  }
}

const retrieveDatabase = async (
  token: string,
  databaseId: string
): Promise<NotionDatabaseSummary> => {
  try {
    const notion = createNotionClient(token)
    const database = await notion.databases.retrieve({
      database_id: databaseId
    })

    if (!isFullDatabase(database)) {
      throw new NotFoundError('Notion database not found.')
    }

    return mapDatabaseSummary(database)
  } catch (error) {
    mapNotionError(error)
  }

  throw new AppError(502, 'Notion request failed.')
}

const retrieveDataSource = async (
  token: string,
  dataSourceId: string
): Promise<NotionDataSource> => {
  try {
    const notion = createNotionClient(token)
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId
    })

    if (!isFullDataSource(dataSource)) {
      throw new NotFoundError('Notion data source not found.')
    }

    return {
      id: dataSource.id,
      title: dataSource.title,
      properties: dataSource.properties
    }
  } catch (error) {
    mapNotionError(error)
  }

  throw new AppError(502, 'Notion request failed.')
}

const listSearchDataSources = async (
  token: string
): Promise<NotionDataSourceSummary[]> => {
  try {
    const notion = createNotionClient(token)
    const results: NotionDataSourceSummary[] = []

    for await (const result of iteratePaginatedAPI(notion.search, {
      filter: {
        property: 'object',
        value: 'data_source'
      },
      page_size: DEFAULT_PAGE_SIZE
    })) {
      if (!isFullPageOrDataSource(result) || result.object !== 'data_source') {
        continue
      }

      results.push({
        object: 'data_source',
        id: result.id,
        name: result.title.map((item) => item.plain_text).join(''),
        parent: result.parent
      })
    }

    return results
  } catch (error) {
    mapNotionError(error)
  }

  throw new AppError(502, 'Notion request failed.')
}

const queryDataSourcePages = async (
  token: string,
  dataSourceId: string
): Promise<NotionPage[]> => {
  try {
    const notion = createNotionClient(token)
    const pages: NotionPage[] = []

    for await (const result of iteratePaginatedAPI(notion.dataSources.query, {
      data_source_id: dataSourceId,
      page_size: DEFAULT_PAGE_SIZE
    })) {
      if (!isFullPageOrDataSource(result) || result.object !== 'page') {
        continue
      }

      pages.push(result)
    }

    return pages
  } catch (error) {
    mapNotionError(error)
  }

  throw new AppError(502, 'Notion request failed.')
}

const getProjectOrThrow = async (
  projectId: string,
  organizationId: string | undefined
): Promise<Project> => {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectByIdWithSecrets(projectId, organizationId)

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

const getStoredNotionToken = (
  project: Pick<Project, 'notionToken'>
): string => {
  if (!project.notionToken) {
    throw new AppError(400, 'Notion is not connected for this project.')
  }

  return decrypt(project.notionToken)
}

const getStoredDatabaseId = (
  project: Pick<Project, 'notionDatabaseId'>
): string => {
  if (!project.notionDatabaseId) {
    throw new AppError(400, 'No Notion database is configured for this project.')
  }

  return project.notionDatabaseId
}

const assertProjectHasNotionConfig = (
  project: Pick<Project, 'notionToken' | 'notionDatabaseId'>
): void => {
  if (!project.notionToken || !project.notionDatabaseId) {
    throw new AppError(400, 'Notion is not connected for this project.')
  }
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

  if (statusProperty.type === 'status' && statusProperty.status?.name) {
    return statusProperty.status.name
  }

  if (statusProperty.type === 'select' && statusProperty.select?.name) {
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
    .map((person) => ('name' in person ? person.name : null))
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

export const enqueueManualSync = async (
  projectId: string,
  organizationId: string | undefined
): Promise<{
  alreadyQueued: boolean
  jobId: string
  projectId: string
}> => {
  const project = await getProjectOrThrow(projectId, organizationId)

  assertProjectHasNotionConfig(project)

  const queuedJob = await enqueueProjectSync(project.id, 'manual')

  return {
    projectId: project.id,
    ...queuedJob
  }
}

const fetchTicketsFromProject = async (
  project: Pick<Project, 'id' | 'notionToken' | 'notionDatabaseId' | 'statusMapping'>
): Promise<SyncedTicketRecord[]> => {
  assertProjectHasNotionConfig(project)

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

export const fetchTickets = async (
  projectId: string,
  organizationId: string | undefined
): Promise<SyncedTicketRecord[]> => {
  const project = await getProjectOrThrow(projectId, organizationId)
  return fetchTicketsFromProject(project)
}

export const fetchTicketsForSync = async (
  projectId: string
): Promise<SyncedTicketRecord[]> => {
  const project = await findProjectSyncContext(projectId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  return fetchTicketsFromProject(project)
}

export const isNotionRateLimitError = (error: unknown): boolean => {
  return error instanceof AppError && error.statusCode === 429
}
