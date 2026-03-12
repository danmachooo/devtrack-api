import type { IncomingHttpHeaders } from 'node:http'

import { AppError } from '@/core/errors/app.error'
import type {
  CreateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput
} from '@/features/organization/organization.schema'
import {
  acceptOrganizationInvitation,
  cancelOrganizationInvitation,
  createOrganizationRecord,
  deleteOrganizationMember,
  getCurrentOrganizationRecord,
  inviteMemberToOrganization,
  listOrganizationInvitations,
  listOrganizationMembers,
  listUserOrganizationInvitations,
  rejectOrganizationInvitation,
  setActiveOrganizationRecord,
  updateOrganizationMemberRole
} from '@/features/organization/organization.repo'

type OrganizationServiceResult<T> = {
  statusCode: number
  data: T
  setCookies: string[]
}

const applySetCookiesToHeaders = (
  headers: IncomingHttpHeaders,
  setCookies: string[]
): IncomingHttpHeaders => {
  if (setCookies.length === 0) {
    return headers
  }

  const cookieMap = new Map<string, string>()
  const existingCookieHeader = headers.cookie

  if (typeof existingCookieHeader === 'string') {
    for (const cookie of existingCookieHeader.split(';')) {
      const [name, ...valueParts] = cookie.trim().split('=')

      if (!name || valueParts.length === 0) {
        continue
      }

      cookieMap.set(name, valueParts.join('='))
    }
  }

  for (const setCookie of setCookies) {
    const [cookiePair] = setCookie.split(';')
    const [name, ...valueParts] = cookiePair.trim().split('=')

    if (!name || valueParts.length === 0) {
      continue
    }

    cookieMap.set(name, valueParts.join('='))
  }

  return {
    ...headers,
    cookie: Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }
}

const getErrorMessage = (data: unknown, fallback: string): string => {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  return fallback
}

const sanitizeMember = (member: {
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
}) => ({
  id: member.id,
  organizationId: member.organizationId,
  userId: member.userId,
  role: member.role,
  createdAt: member.createdAt,
  user: member.user
    ? {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image ?? null
      }
    : undefined
})

const sanitizeInvitation = (invitation: {
  id: string
  email: string
  role: string
  status: string
  inviterId: string
  expiresAt: string
  createdAt: string
  organizationId?: string
  organizationName?: string
}) => ({
  id: invitation.id,
  email: invitation.email,
  role: invitation.role,
  status: invitation.status,
  inviterId: invitation.inviterId,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
  organizationId: invitation.organizationId,
  organizationName: invitation.organizationName
})

export async function createOrganization(
  headers: IncomingHttpHeaders,
  input: CreateOrganizationInput
): Promise<
  OrganizationServiceResult<{
    id: string
    name: string
    slug: string
    logo?: string | null
    members: Array<ReturnType<typeof sanitizeMember>>
  }>
> {
  const result = await createOrganizationRecord(headers, input)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to create organization.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      id: result.data.id,
      name: result.data.name,
      slug: result.data.slug,
      logo: result.data.logo ?? null,
      members: result.data.members.map((member) =>
        sanitizeMember({
          ...member
        })
      )
    }
  }
}

export async function getOrganization(
  headers: IncomingHttpHeaders
): Promise<OrganizationServiceResult<unknown>> {
  const result = await getCurrentOrganizationRecord(headers)

  if (result.statusCode >= 400) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to retrieve organization.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: result.data
  }
}

export async function inviteMember(
  headers: IncomingHttpHeaders,
  input: InviteMemberInput
): Promise<OrganizationServiceResult<unknown>> {
  const result = await inviteMemberToOrganization(headers, input)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to invite member.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: result.data
  }
}

export async function getOrganizationMembers(
  headers: IncomingHttpHeaders
): Promise<OrganizationServiceResult<unknown>> {
  const result = await listOrganizationMembers(headers)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to retrieve members.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      members: result.data.members.map((member) => sanitizeMember(member)),
      total: result.data.total
    }
  }
}

export async function getOrganizationInvitations(
  headers: IncomingHttpHeaders
): Promise<OrganizationServiceResult<unknown>> {
  const result = await listOrganizationInvitations(headers)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to retrieve invitations.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      invitations: result.data.map((invitation) => sanitizeInvitation(invitation)),
      total: result.data.length
    }
  }
}

export async function getUserInvitations(
  headers: IncomingHttpHeaders
): Promise<OrganizationServiceResult<unknown>> {
  const result = await listUserOrganizationInvitations(headers)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to retrieve user invitations.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      invitations: result.data.map((invitation) => sanitizeInvitation(invitation)),
      total: result.data.length
    }
  }
}

export async function updateMemberRole(
  headers: IncomingHttpHeaders,
  memberId: string,
  input: UpdateMemberRoleInput
): Promise<OrganizationServiceResult<unknown>> {
  const result = await updateOrganizationMemberRole(headers, {
    memberId,
    role: input.role
  })

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to update member role.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: sanitizeMember(result.data)
  }
}

export async function removeMember(
  headers: IncomingHttpHeaders,
  memberId: string
): Promise<OrganizationServiceResult<unknown>> {
  const result = await deleteOrganizationMember(headers, {
    memberIdOrEmail: memberId
  })

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to remove member.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: sanitizeMember(result.data.member)
  }
}

export async function acceptInvitation(
  headers: IncomingHttpHeaders,
  invitationId: string
): Promise<OrganizationServiceResult<unknown>> {
  const result = await acceptOrganizationInvitation(headers, {
    invitationId
  })

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to accept invitation.')
    )
  }

  const headersWithUpdatedCookies = applySetCookiesToHeaders(
    headers,
    result.setCookies
  )

  const activeOrganization = await setActiveOrganizationRecord(
    headersWithUpdatedCookies,
    {
      organizationId: result.data.organizationId
    }
  )

  if (activeOrganization.statusCode >= 400) {
    throw new AppError(
      activeOrganization.statusCode,
      getErrorMessage(
        activeOrganization.data,
        'Invitation was accepted but active organization could not be set.'
      )
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: [...result.setCookies, ...activeOrganization.setCookies],
    data: sanitizeMember(result.data)
  }
}

export async function rejectInvitation(
  headers: IncomingHttpHeaders,
  invitationId: string
): Promise<OrganizationServiceResult<unknown>> {
  const result = await rejectOrganizationInvitation(headers, {
    invitationId
  })

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to reject invitation.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: sanitizeInvitation(result.data.invitation)
  }
}

export async function cancelInvitation(
  headers: IncomingHttpHeaders,
  invitationId: string
): Promise<OrganizationServiceResult<unknown>> {
  const result = await cancelOrganizationInvitation(headers, {
    invitationId
  })

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to cancel invitation.')
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: sanitizeInvitation(result.data)
  }
}
