import { TicketStatus } from '@prisma/client'

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
