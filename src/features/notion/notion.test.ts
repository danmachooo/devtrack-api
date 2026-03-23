import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  decryptMock,
  findProjectByIdWithSecretsMock,
  getNotionDatabaseSchemaMock,
  getSessionMock,
  memberFindUniqueMock
} = vi.hoisted(() => {
  process.env.NODE_ENV = 'test'
  process.env.BASE_URL = 'http://localhost:3000'
  process.env.TRUSTED_ORIGINS = 'http://localhost:3000'
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'
  process.env.BETTER_AUTH_SECRET = 'test-secret'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/devtrack'
  process.env.REDIS_HOST = 'localhost'
  process.env.REDIS_USERNAME = 'default'
  process.env.REDIS_PASSWORD = 'password'
  process.env.UPSTASH_REDIS_TCP_URL = 'redis://localhost:6379'
  process.env.FRONTEND_URL = 'http://localhost:5173'
  process.env.SMTP_HOST = 'localhost'
  process.env.SMTP_USER = 'mailer@example.com'
  process.env.SMTP_PASS = 'password'
  process.env.SMTP_FROM = 'DevTrack <mailer@example.com>'
  process.env.NOTION_ENCRYPTION_KEY =
    '12345678901234567890123456789012'

  return {
    decryptMock: vi.fn(),
    findProjectByIdWithSecretsMock: vi.fn(),
    getNotionDatabaseSchemaMock: vi.fn(),
    getSessionMock: vi.fn(),
    memberFindUniqueMock: vi.fn()
  }
})

const VALID_PROJECT_ID = '11111111-1111-4111-8111-111111111111'

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

vi.mock('@/lib/auth', () => {
  return {
    auth: {
      api: {
        getSession: getSessionMock
      }
    }
  }
})

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      member: {
        findUnique: memberFindUniqueMock
      }
    }
  }
})

vi.mock('@/lib/encryption', () => {
  return {
    decrypt: decryptMock,
    encrypt: vi.fn()
  }
})

vi.mock('@/features/projects/projects.repo', () => {
  return {
    findProjectByIdWithSecrets: findProjectByIdWithSecretsMock,
    updateProjectNotionConnection: vi.fn(),
    updateProjectStatusMapping: vi.fn()
  }
})

vi.mock('@/features/notion/notion.repo', () => {
  return {
    getNotionDatabaseSchema: getNotionDatabaseSchemaMock,
    findProjectSyncContext: vi.fn()
  }
})

import { requireAuthMiddleware } from '@/common/middleware/require-auth.middleware'
import { errorHandler } from '@/core/middleware/error-handler'
import { notionRouter } from '@/features/notion/notion.routes'

const testApp = express()
testApp.use(express.json())
testApp.use('/api/projects/:id/notion', requireAuthMiddleware, notionRouter)
testApp.use(errorHandler)

describe('GET /api/projects/:id/notion/status-mapping/default', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'lead@example.com',
        name: 'Team Lead',
        role: 'TEAM_LEADER'
      },
      session: {
        activeOrganizationId: 'org-1'
      }
    })

    memberFindUniqueMock.mockResolvedValue({
      role: 'TEAM_LEADER'
    })

    findProjectByIdWithSecretsMock.mockResolvedValue({
      id: VALID_PROJECT_ID,
      organizationId: 'org-1',
      notionToken: 'encrypted-token',
      notionDatabaseId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    })

    decryptMock.mockReturnValue('decrypted-token')
    getNotionDatabaseSchemaMock.mockResolvedValue([
      'In Progress',
      'Done',
      'Unexpected Status'
    ])
  })

  it('returns a pre-filled status mapping for a connected project', async () => {
    const response = await request(testApp)
      .get(
        `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
      )
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      statusCode: 200,
      message: 'Default Notion status mapping generated successfully.',
      data: {
        projectId: VALID_PROJECT_ID,
        statusMapping: {
          'In Progress': 'IN_DEV',
          Done: 'RELEASED',
          'Unexpected Status': 'TODO'
        }
      }
    })
    expect(decryptMock).toHaveBeenCalledWith('encrypted-token')
    expect(getNotionDatabaseSchemaMock).toHaveBeenCalledWith(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'decrypted-token'
    )
  })

  it('defaults unknown Notion statuses to TODO', async () => {
    getNotionDatabaseSchemaMock.mockResolvedValueOnce(['Mystery Stage'])

    const response = await request(testApp)
      .get(
        `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
      )
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(200)
    expect(response.body.data.statusMapping).toEqual({
      'Mystery Stage': 'TODO'
    })
  })

  it('returns 400 when the project is not connected to Notion', async () => {
    findProjectByIdWithSecretsMock.mockResolvedValueOnce({
      id: VALID_PROJECT_ID,
      organizationId: 'org-1',
      notionToken: null,
      notionDatabaseId: null
    })

    const response = await request(testApp)
      .get(
        `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
      )
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(400)
    expect(response.body.message).toBe(
      'Connect Notion before generating a status mapping.'
    )
  })

  it('returns 404 when the project does not exist', async () => {
    findProjectByIdWithSecretsMock.mockResolvedValueOnce(null)

    const response = await request(testApp)
      .get(
        `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
      )
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Project not found.')
  })

  it('returns 401 when the request is unauthenticated', async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const response = await request(testApp).get(
      `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
    )

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized.')
  })

  it('returns 403 when the user does not have the TEAM_LEADER role', async () => {
    memberFindUniqueMock.mockResolvedValueOnce({
      role: 'DEVELOPER'
    })

    const response = await request(testApp)
      .get(
        `/api/projects/${VALID_PROJECT_ID}/notion/status-mapping/default`
      )
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(403)
    expect(response.body.message).toContain('TEAM_LEADER')
  })

  it('returns 400 when the project id is invalid', async () => {
    const response = await request(testApp)
      .get('/api/projects/not-a-uuid/notion/status-mapping/default')
      .set('Cookie', 'session=mock')

    expect(response.status).toBe(400)
  })
})
