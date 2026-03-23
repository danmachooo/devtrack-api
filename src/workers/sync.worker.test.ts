import { SyncStatus, TicketStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createRedisConnectionMock,
  fetchTicketsForSyncMock,
  insertSyncLogMock,
  isNotionRateLimitErrorMock,
  upsertFeatureByNameMock
} = vi.hoisted(() => {
  return {
    createRedisConnectionMock: vi.fn(),
    fetchTicketsForSyncMock: vi.fn(),
    insertSyncLogMock: vi.fn(),
    isNotionRateLimitErrorMock: vi.fn(),
    upsertFeatureByNameMock: vi.fn()
  }
})

vi.mock('@/config/config', () => {
  return {
    appConfig: {
      redis: {
        queuePrefix: 'devtrack-test'
      }
    }
  }
})

vi.mock('@/core/logger/logger', () => {
  return {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    }
  }
})

vi.mock('@/features/features/features.repo', () => {
  return {
    normalizeFeatureName: (name: string): string => {
      return name
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0)
        .map((part) => {
          const lowerCasedPart = part.toLowerCase()
          return lowerCasedPart.charAt(0).toUpperCase() + lowerCasedPart.slice(1)
        })
        .join(' ')
    },
    upsertFeatureByName: upsertFeatureByNameMock
  }
})

vi.mock('@/features/notion/notion.service', () => {
  return {
    fetchTicketsForSync: fetchTicketsForSyncMock,
    isNotionRateLimitError: isNotionRateLimitErrorMock
  }
})

vi.mock('@/features/notion/notion.repo', () => {
  return {
    insertSyncLog: insertSyncLogMock,
    persistTicketSync: vi.fn()
  }
})

vi.mock('@/features/progress/progress.service', () => {
  return {
    calculateProjectProgress: vi.fn()
  }
})

vi.mock('@/lib/redis', () => {
  return {
    createRedisConnection: createRedisConnectionMock,
    getBullMqConnectionOptions: vi.fn()
  }
})

vi.mock('@/workers/sync.queue', () => {
  return {
    SYNC_JOB_NAME: 'sync-project-tickets',
    SYNC_QUEUE_NAME: 'ticket-sync'
  }
})

vi.mock('bullmq', () => {
  return {
    Worker: vi.fn()
  }
})

import { syncProjectTickets } from '@/workers/sync.worker'

describe('syncProjectTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    createRedisConnectionMock.mockReturnValue({
      set: vi.fn(),
      eval: vi.fn(),
      quit: vi.fn()
    })

    isNotionRateLimitErrorMock.mockReturnValue(false)
    insertSyncLogMock.mockResolvedValue(undefined)
    upsertFeatureByNameMock.mockResolvedValue({
      id: 'feature-1',
      name: 'User Auth'
    })
  })

  it('auto-creates normalized features and assigns tickets idempotently', async () => {
    const acquireProjectSyncLock = vi.fn().mockResolvedValue(true)
    const releaseProjectSyncLock = vi.fn().mockResolvedValue(undefined)
    const persistTicketSync = vi.fn().mockResolvedValue({
      ticketsAdded: 2,
      ticketsUpdated: 1,
      ticketsMarkedMissing: 0
    })
    const calculateProjectProgress = vi.fn().mockResolvedValue(67)

    const result = await syncProjectTickets(
      {
        projectId: 'project-1',
        trigger: 'manual'
      },
      {
        acquireProjectSyncLock,
        releaseProjectSyncLock,
        fetchTicketsForSync: vi.fn().mockResolvedValue([
          {
            notionPageId: 'page-1',
            title: 'Ticket 1',
            notionStatus: 'In Progress',
            devtrackStatus: TicketStatus.IN_DEV,
            assigneeName: 'Alex',
            moduleName: ' user auth ',
            notionUpdatedAt: new Date('2026-03-23T00:00:00.000Z')
          },
          {
            notionPageId: 'page-2',
            title: 'Ticket 2',
            notionStatus: 'Todo',
            devtrackStatus: TicketStatus.TODO,
            assigneeName: null,
            moduleName: 'USER AUTH',
            notionUpdatedAt: new Date('2026-03-23T00:05:00.000Z')
          },
          {
            notionPageId: 'page-3',
            title: 'Ticket 3',
            notionStatus: 'Done',
            devtrackStatus: TicketStatus.RELEASED,
            assigneeName: 'Sam',
            moduleName: null,
            notionUpdatedAt: new Date('2026-03-23T00:10:00.000Z')
          }
        ]),
        upsertFeatureByName: upsertFeatureByNameMock,
        persistTicketSync,
        calculateProjectProgress,
        insertSyncLog: insertSyncLogMock
      }
    )

    expect(upsertFeatureByNameMock).toHaveBeenCalledTimes(1)
    expect(upsertFeatureByNameMock).toHaveBeenCalledWith('project-1', 'User Auth')

    expect(persistTicketSync).toHaveBeenCalledTimes(1)
    expect(persistTicketSync.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        notionPageId: 'page-1',
        moduleName: ' user auth ',
        featureId: 'feature-1'
      }),
      expect.objectContaining({
        notionPageId: 'page-2',
        moduleName: 'USER AUTH',
        featureId: 'feature-1'
      }),
      expect.objectContaining({
        notionPageId: 'page-3',
        moduleName: null
      })
    ])
    expect(persistTicketSync.mock.calls[0]?.[1]?.[2]).not.toHaveProperty('featureId')

    expect(insertSyncLogMock).toHaveBeenCalledWith(
      'project-1',
      SyncStatus.SUCCESS,
      2,
      1
    )
    expect(result).toEqual({
      projectId: 'project-1',
      skipped: false,
      projectProgress: 67,
      ticketsAdded: 2,
      ticketsUpdated: 1,
      ticketsMarkedMissing: 0
    })
    expect(releaseProjectSyncLock).toHaveBeenCalledTimes(1)
  })

  it('skips duplicate sync jobs when the project lock is already held', async () => {
    const fetchTickets = vi.fn()

    const result = await syncProjectTickets(
      {
        projectId: 'project-1',
        trigger: 'scheduled'
      },
      {
        acquireProjectSyncLock: vi.fn().mockResolvedValue(false),
        releaseProjectSyncLock: vi.fn().mockResolvedValue(undefined),
        fetchTicketsForSync: fetchTickets,
        upsertFeatureByName: upsertFeatureByNameMock,
        persistTicketSync: vi.fn(),
        calculateProjectProgress: vi.fn(),
        insertSyncLog: insertSyncLogMock
      }
    )

    expect(result).toEqual({
      projectId: 'project-1',
      skipped: true
    })
    expect(fetchTickets).not.toHaveBeenCalled()
    expect(insertSyncLogMock).not.toHaveBeenCalled()
  })

  it('records RATE_LIMITED sync logs when Notion rate limits the worker', async () => {
    const rateLimitedError = new Error('Notion rate limit exceeded.')
    const releaseProjectSyncLock = vi.fn().mockResolvedValue(undefined)

    isNotionRateLimitErrorMock.mockImplementation((error: unknown) => {
      return error === rateLimitedError
    })

    await expect(
      syncProjectTickets(
        {
          projectId: 'project-1',
          trigger: 'manual'
        },
        {
          acquireProjectSyncLock: vi.fn().mockResolvedValue(true),
          releaseProjectSyncLock,
          fetchTicketsForSync: vi.fn().mockRejectedValue(rateLimitedError),
          upsertFeatureByName: upsertFeatureByNameMock,
          persistTicketSync: vi.fn(),
          calculateProjectProgress: vi.fn(),
          insertSyncLog: insertSyncLogMock
        }
      )
    ).rejects.toThrow('Notion rate limit exceeded.')

    expect(insertSyncLogMock).toHaveBeenCalledWith(
      'project-1',
      SyncStatus.RATE_LIMITED,
      0,
      0,
      'Notion rate limit exceeded.'
    )
    expect(releaseProjectSyncLock).toHaveBeenCalledTimes(1)
  })
})
