import { Router } from 'express'

import { requireAuthMiddleware } from '@/common/middleware/require-auth.middleware'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  acceptInvitationController,
  cancelInvitationController,
  createOrganizationController,
  getOrganizationController,
  getOrganizationInvitationsController,
  getOrganizationMembersController,
  getUserInvitationsController,
  inviteMemberController,
  rejectInvitationController,
  removeMemberController,
  updateMemberRoleController
} from '@/features/organization/organization.controller'
import {
  createOrganizationSchema,
  inviteMemberSchema,
  invitationIdentifierSchema,
  memberIdentifierSchema,
  updateMemberRoleSchema
} from '@/features/organization/organization.schema'

const organizationRouter = Router()

organizationRouter.post(
  '/',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  validateBody(createOrganizationSchema),
  createOrganizationController
)

organizationRouter.get('/', requireAuthMiddleware, getOrganizationController)

organizationRouter.post(
  '/invite',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  validateBody(inviteMemberSchema),
  inviteMemberController
)

organizationRouter.get(
  '/invitations',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  getOrganizationInvitationsController
)

organizationRouter.get(
  '/invitations/me',
  requireAuthMiddleware,
  getUserInvitationsController
)

organizationRouter.post(
  '/invitations/:id/accept',
  requireAuthMiddleware,
  validateParams(invitationIdentifierSchema),
  acceptInvitationController
)

organizationRouter.post(
  '/invitations/:id/reject',
  requireAuthMiddleware,
  validateParams(invitationIdentifierSchema),
  rejectInvitationController
)

organizationRouter.post(
  '/invitations/:id/cancel',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(invitationIdentifierSchema),
  cancelInvitationController
)

organizationRouter.get(
  '/members',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  getOrganizationMembersController
)

organizationRouter.patch(
  '/members/:id',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(memberIdentifierSchema),
  validateBody(updateMemberRoleSchema),
  updateMemberRoleController
)

organizationRouter.delete(
  '/members/:id',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(memberIdentifierSchema),
  removeMemberController
)

export { organizationRouter }
