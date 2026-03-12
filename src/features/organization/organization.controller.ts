import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import type {
  CreateOrganizationInput,
  InvitationIdentifier,
  InviteMemberInput,
  MemberIdentifier,
  UpdateMemberRoleInput
} from '@/features/organization/organization.schema'
import {
  acceptInvitation,
  cancelInvitation,
  createOrganization,
  getOrganization,
  getOrganizationInvitations,
  getOrganizationMembers,
  getUserInvitations,
  inviteMember,
  rejectInvitation,
  removeMember,
  updateMemberRole
} from '@/features/organization/organization.service'

const appendSetCookies = (
  http: AuthenticatedHttpContext,
  setCookies: string[]
): void => {
  for (const cookie of setCookies) {
    http.res.append('Set-Cookie', cookie)
  }
}

export const createOrganizationController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const body: CreateOrganizationInput = http.req.validatedBody
    const result = await createOrganization(http.req.headers, body)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      201,
      'Organization has been created.',
      result.data
    )
  }
)

export const getOrganizationController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const result = await getOrganization(http.req.headers)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Organization has been found.',
      result.data
    )
  }
)

export const inviteMemberController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const body: InviteMemberInput = http.req.validatedBody
    const result = await inviteMember(http.req.headers, body)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      201,
      'Member invitation has been created.',
      result.data
    )
  }
)

export const getOrganizationMembersController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const result = await getOrganizationMembers(http.req.headers)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Organization members have been found.',
      result.data
    )
  }
)

export const getOrganizationInvitationsController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const result = await getOrganizationInvitations(http.req.headers)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Organization invitations have been found.',
      result.data
    )
  }
)

export const getUserInvitationsController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const result = await getUserInvitations(http.req.headers)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'User invitations have been found.',
      result.data
    )
  }
)

export const updateMemberRoleController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const member: MemberIdentifier = http.req.validatedParams
    const body: UpdateMemberRoleInput = http.req.validatedBody
    const result = await updateMemberRole(http.req.headers, member.id, body)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Member role has been updated.',
      result.data
    )
  }
)

export const removeMemberController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const member: MemberIdentifier = http.req.validatedParams
    const result = await removeMember(http.req.headers, member.id)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Member has been removed.',
      result.data
    )
  }
)

export const acceptInvitationController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const invitation: InvitationIdentifier = http.req.validatedParams
    const result = await acceptInvitation(http.req.headers, invitation.id)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Invitation has been accepted.',
      result.data
    )
  }
)

export const rejectInvitationController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const invitation: InvitationIdentifier = http.req.validatedParams
    const result = await rejectInvitation(http.req.headers, invitation.id)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,
      'Invitation has been rejected.',
      result.data
    )
  }
)

export const cancelInvitationController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const invitation: InvitationIdentifier = http.req.validatedParams
    const result = await cancelInvitation(http.req.headers, invitation.id)

    appendSetCookies(http, result.setCookies)
    return sendResponse(
      http.res,
      200,  
      'Invitation has been canceled.',
      result.data
    )
  }
)
