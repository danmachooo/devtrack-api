import type { IncomingHttpHeaders } from 'node:http'

import { fromNodeHeaders } from 'better-auth/node'

import { appConfig } from '@/config/config'
import { auth } from '@/lib/auth'

type OrganizationProxyResult<T> = {
  statusCode: number
  data: T | null
  setCookies: string[]
}

const getAuthUrl = (path: string): URL => {
  const normalizedBaseUrl = appConfig.auth.url.endsWith('/')
    ? appConfig.auth.url
    : `${appConfig.auth.url}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path

  return new URL(normalizedPath, normalizedBaseUrl)
}

const getSetCookies = (headers: Headers): string[] => {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie()
  }

  const setCookie = headers.get('set-cookie')
  return setCookie ? [setCookie] : []
}

async function proxyOrganizationRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  headers: IncomingHttpHeaders,
  body?: unknown
): Promise<OrganizationProxyResult<T>> {
  const requestHeaders = fromNodeHeaders(headers)
  const origin = headers.origin ?? appConfig.frontend.url

  requestHeaders.set('origin', origin)

  if (body !== undefined) {
    requestHeaders.set('content-type', 'application/json')
  }

  const response = await auth.handler(
    new Request(getAuthUrl(path), {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  )

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? ((await response.json()) as T)
    : null

  return {
    statusCode: response.status,
    data,
    setCookies: getSetCookies(response.headers)
  }
}

export async function createOrganizationRecord(
  headers: IncomingHttpHeaders,
  body: {
    name: string
    slug: string
    logo?: string
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    name: string
    slug: string
    logo?: string | null
    metadata?: unknown
    members: Array<{
      id: string
      userId: string
      organizationId: string
      role: string
      createdAt: string
    }>
  }>('organization/create', 'POST', headers, body)
}

export async function getCurrentOrganizationRecord(headers: IncomingHttpHeaders) {
  return await proxyOrganizationRequest<{
    id: string
    name: string
    slug: string
    logo?: string | null
    metadata?: unknown
    members: Array<{
      id: string
      userId: string
      organizationId: string
      role: string
      createdAt: string
      user: {
        id: string
        name: string
        email: string
        image?: string | null
      }
    }>
    invitations: Array<{
      id: string
      email: string
      role: string
      status: string
      expiresAt: string
      inviterId: string
      createdAt: string
    }>
  }>('organization/get-full-organization', 'GET', headers)
}

export async function inviteMemberToOrganization(
  headers: IncomingHttpHeaders,
  body: {
    email: string
    role: string
    resend?: boolean
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    organizationId: string
    email: string
    role: string
    status: string
    inviterId: string
    expiresAt: string
    createdAt: string
  }>('organization/invite-member', 'POST', headers, body)
}

export async function listOrganizationInvitations(headers: IncomingHttpHeaders) {
  return await proxyOrganizationRequest<
    Array<{
      id: string
      email: string
      role: string
      status: string
      inviterId: string
      expiresAt: string
      createdAt: string
    }>
  >('organization/list-invitations', 'GET', headers)
}

export async function listUserOrganizationInvitations(
  headers: IncomingHttpHeaders
) {
  return await proxyOrganizationRequest<
    Array<{
      id: string
      email: string
      role: string
      organizationId: string
      organizationName: string
      inviterId: string
      status: string
      expiresAt: string
      createdAt: string
    }>
  >('organization/list-user-invitations', 'GET', headers)
}

export async function acceptOrganizationInvitation(
  headers: IncomingHttpHeaders,
  body: {
    invitationId: string
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    organizationId: string
    userId: string
    role: string
    createdAt: string
    user?: {
      id: string
      name: string
      email: string
      image?: string | null
    }
  }>('organization/accept-invitation', 'POST', headers, body)
}

export async function setActiveOrganizationRecord(
  headers: IncomingHttpHeaders,
  body: {
    organizationId: string
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    name: string
    slug: string
    logo?: string | null
  }>('organization/set-active', 'POST', headers, body)
}

export async function rejectOrganizationInvitation(
  headers: IncomingHttpHeaders,
  body: {
    invitationId: string
  }
) {
  return await proxyOrganizationRequest<{
    invitation: {
      id: string
      email: string
      role: string
      status: string
      inviterId: string
      expiresAt: string
      createdAt: string
    }
  }>('organization/reject-invitation', 'POST', headers, body)
}

export async function cancelOrganizationInvitation(
  headers: IncomingHttpHeaders,
  body: {
    invitationId: string
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    organizationId: string
    email: string
    role: string
    status: string
    inviterId: string
    expiresAt: string
    createdAt: string
  }>('organization/cancel-invitation', 'POST', headers, body)
}

export async function listOrganizationMembers(headers: IncomingHttpHeaders) {
  return await proxyOrganizationRequest<{
    members: Array<{
      id: string
      organizationId: string
      userId: string
      role: string
      createdAt: string
      user: {
        id: string
        name: string
        email: string
        image?: string | null
      }
    }>
    total: number
  }>('organization/list-members', 'GET', headers)
}

export async function updateOrganizationMemberRole(
  headers: IncomingHttpHeaders,
  body: {
    memberId: string
    role: string
  }
) {
  return await proxyOrganizationRequest<{
    id: string
    organizationId: string
    userId: string
    role: string
    createdAt: string
    user: {
      id: string
      name: string
      email: string
      image?: string | null
    }
  }>('organization/update-member-role', 'POST', headers, body)
}

export async function deleteOrganizationMember(
  headers: IncomingHttpHeaders,
  body: {
    memberIdOrEmail: string
  }
) {
  return await proxyOrganizationRequest<{
    member: {
      id: string
      organizationId: string
      userId: string
      role: string
      createdAt: string
      user: {
        id: string
        name: string
        email: string
        image?: string | null
      }
    }
  }>('organization/remove-member', 'POST', headers, body)
}
