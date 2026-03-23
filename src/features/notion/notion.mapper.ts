import type { PageObjectResponse } from '@notionhq/client'
import { TicketStatus } from '@prisma/client'

import type { SyncedTicketRecord } from '@/features/notion/notion.repo'

const DEFAULT_STATUS_MAPPING: Record<string, TicketStatus> = {
  TODO: TicketStatus.TODO,
  BACKLOG: TicketStatus.TODO,
  'TO DO': TicketStatus.TODO,
  'IN PROGRESS': TicketStatus.IN_DEV,
  'IN DEV': TicketStatus.IN_DEV,
  DEVELOPMENT: TicketStatus.IN_DEV,
  QA: TicketStatus.QA,
  TESTING: TicketStatus.QA,
  APPROVED: TicketStatus.APPROVED,
  DONE: TicketStatus.RELEASED,
  RELEASED: TicketStatus.RELEASED,
  BLOCKED: TicketStatus.BLOCKED
}

const normalizeStatusKey = (value: string): string => {
  return value.trim().toUpperCase()
}

const MODULE_PROPERTY_NAMES = ['MODULE', 'FEATURE'] as const

const getPlainText = (value: Array<{ plain_text: string }> | undefined): string => {
  if (!value || value.length === 0) {
    return ''
  }

  return value.map((item) => item.plain_text).join('')
}

const getTitleFromPage = (page: PageObjectResponse): string => {
  const titleProperty = Object.values(page.properties).find((property) => {
    return property.type === 'title'
  })

  if (!titleProperty?.title) {
    return 'Untitled'
  }

  const title = getPlainText(titleProperty.title)
  return title || 'Untitled'
}

const getStatusFromPage = (page: PageObjectResponse): string => {
  const statusProperty = Object.values(page.properties).find((property) => {
    return property.type === 'status' || property.type === 'select'
  })

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

const getAssigneeFromPage = (page: PageObjectResponse): string | null => {
  const peopleProperty = Object.values(page.properties).find((property) => {
    return property.type === 'people'
  })

  if (!peopleProperty?.people || peopleProperty.people.length === 0) {
    return null
  }

  const names = peopleProperty.people
    .map((person) => ('name' in person ? person.name : null))
    .filter((name): name is string => Boolean(name))

  return names.length > 0 ? names.join(', ') : null
}

const getModuleOrFeatureProperty = (
  page: PageObjectResponse
): PageObjectResponse['properties'][string] | undefined => {
  return Object.entries(page.properties).find(([propertyName]) => {
    return MODULE_PROPERTY_NAMES.includes(
      propertyName.trim().toUpperCase() as (typeof MODULE_PROPERTY_NAMES)[number]
    )
  })?.[1]
}

const getModuleNameFromPage = (page: PageObjectResponse): string | null => {
  const moduleProperty = getModuleOrFeatureProperty(page)

  if (!moduleProperty) {
    return null
  }

  if (moduleProperty.type === 'rich_text') {
    const value = getPlainText(moduleProperty.rich_text).trim()
    return value.length > 0 ? value : null
  }

  if (moduleProperty.type === 'title') {
    const value = getPlainText(moduleProperty.title).trim()
    return value.length > 0 ? value : null
  }

  if (moduleProperty.type === 'select') {
    return moduleProperty.select?.name?.trim() || null
  }

  if (moduleProperty.type === 'multi_select') {
    const value = moduleProperty.multi_select[0]?.name?.trim() || null
    return value && value.length > 0 ? value : null
  }

  return null
}

export const mapNotionStatusToTicketStatus = (
  notionStatus: string,
  statusMapping: Record<string, TicketStatus> | null | undefined
): TicketStatus => {
  const normalizedStatus = normalizeStatusKey(notionStatus)

  if (statusMapping) {
    for (const [notionKey, ticketStatus] of Object.entries(statusMapping)) {
      if (normalizeStatusKey(notionKey) === normalizedStatus) {
        return ticketStatus
      }
    }
  }

  return DEFAULT_STATUS_MAPPING[normalizedStatus] ?? TicketStatus.TODO
}

export const buildDefaultStatusMapping = (
  notionStatuses: string[]
): Record<string, TicketStatus> => {
  return notionStatuses.reduce<Record<string, TicketStatus>>(
    (statusMapping, notionStatus) => {
      const trimmedStatus = notionStatus.trim()

      if (trimmedStatus.length === 0) {
        return statusMapping
      }

      statusMapping[trimmedStatus] = mapNotionStatusToTicketStatus(
        trimmedStatus,
        null
      )

      return statusMapping
    },
    {}
  )
}

export const mapNotionPageToSyncedTicketRecord = (
  page: PageObjectResponse,
  statusMapping: Record<string, TicketStatus>
): SyncedTicketRecord => {
  const notionStatus = getStatusFromPage(page)

  return {
    notionPageId: page.id,
    title: getTitleFromPage(page),
    notionStatus,
    devtrackStatus: mapNotionStatusToTicketStatus(notionStatus, statusMapping),
    assigneeName: getAssigneeFromPage(page),
    moduleName: getModuleNameFromPage(page),
    notionUpdatedAt: new Date(page.last_edited_time)
  }
}
