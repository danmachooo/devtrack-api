import { appConfig } from '@/config/config'
import { AppError } from '@/core/errors/app.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { UnauthorizedError } from '@/core/errors/unauthorized.error'

type NotionParent =
  | {
      type: 'database_id'
      database_id: string
    }
  | {
      type: 'workspace'
      workspace: true
    }
  | {
      type: string
      [key: string]: unknown
    }

type NotionRichText = {
  plain_text: string
}

export type NotionDatabaseSummary = {
  id: string
  title: NotionRichText[]
  url: string
  data_sources: Array<{
    id: string
    name: string
  }>
}

export type NotionDataSourceSummary = {
  object: 'data_source'
  id: string
  name: string
  parent: NotionParent
}

type NotionPagePropertyValue = {
  id: string
  type: string
  title?: NotionRichText[]
  status?: {
    name: string
  } | null
  select?: {
    name: string
  } | null
  rich_text?: NotionRichText[]
  people?: Array<{
    name: string | null
  }>
}

export type NotionPage = {
  object: 'page'
  id: string
  last_edited_time: string
  properties: Record<string, NotionPagePropertyValue>
}

type NotionListResponse<T> = {
  results: T[]
  has_more: boolean
  next_cursor: string | null
}

type NotionDataSource = {
  id: string
  name: string
  properties: Record<
    string,
    {
      id: string
      name: string
      type: string
    }
  >
}

type NotionErrorResponse = {
  message?: string
}

const DEFAULT_PAGE_SIZE = 100

const notionRequest = async <T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${appConfig.notion.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': appConfig.notion.apiVersion,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (!response.ok) {
    let responseBody: NotionErrorResponse | null

    try {
      responseBody = (await response.json()) as NotionErrorResponse
    } catch {
      responseBody = null
    }

    if (response.status === 401) {
      throw new UnauthorizedError('Invalid Notion token.')
    }

    if (response.status === 403) {
      throw new ForbiddenError(
        'Notion integration does not have access to this resource.'
      )
    }

    if (response.status === 404) {
      throw new NotFoundError('Notion resource not found.')
    }

    if (response.status === 429) {
      throw new AppError(429, 'Notion rate limit exceeded.')
    }

    throw new AppError(
      502,
      responseBody?.message ?? 'Notion request failed.'
    )
  }

  return (await response.json()) as T
}

export const retrieveDatabase = async (
  token: string,
  databaseId: string
): Promise<NotionDatabaseSummary> => {
  return await notionRequest<NotionDatabaseSummary>(`/databases/${databaseId}`, token)
}

export const retrieveDataSource = async (
  token: string,
  dataSourceId: string
): Promise<NotionDataSource> => {
  return await notionRequest<NotionDataSource>(`/data-sources/${dataSourceId}`, token)
}

export const listSearchDataSources = async (
  token: string
): Promise<NotionDataSourceSummary[]> => {
  const results: NotionDataSourceSummary[] = []
  let nextCursor: string | null = null

  do {
    const searchResponse: NotionListResponse<NotionDataSourceSummary> =
      await notionRequest<NotionListResponse<NotionDataSourceSummary>>(
        '/search',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            filter: {
              property: 'object',
              value: 'data_source'
            },
            page_size: DEFAULT_PAGE_SIZE,
            start_cursor: nextCursor ?? undefined
          })
        }
      )

    results.push(...searchResponse.results)
    nextCursor = searchResponse.has_more ? searchResponse.next_cursor : null
  } while (nextCursor)

  return results
}

export const queryDataSourcePages = async (
  token: string,
  dataSourceId: string
): Promise<NotionPage[]> => {
  const pages: NotionPage[] = []
  let nextCursor: string | null = null

  do {
    const queryResponse: NotionListResponse<NotionPage> =
      await notionRequest<NotionListResponse<NotionPage>>(
        `/data-sources/${dataSourceId}/query`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            page_size: DEFAULT_PAGE_SIZE,
            start_cursor: nextCursor ?? undefined
          })
        }
      )

    pages.push(...queryResponse.results)
    nextCursor = queryResponse.has_more ? queryResponse.next_cursor : null
  } while (nextCursor)

  return pages
}
