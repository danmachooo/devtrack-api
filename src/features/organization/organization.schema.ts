import { Role } from '@prisma/client'
import { z } from 'zod'

export const createOrganizationSchema = z.strictObject({
  name: z.string().min(1, 'Organization name is required').max(100),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters long')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  logo: z.url().optional()
})

export const inviteMemberSchema = z.strictObject({
  email: z.email('Invalid email address'),
  role: z.nativeEnum(Role),
  resend: z.boolean().optional()
})

export const updateMemberRoleSchema = z.strictObject({
  role: z.nativeEnum(Role)
})

export const memberIdentifierSchema = z.strictObject({
  id: z.string().min(1)
})

export const invitationIdentifierSchema = z.strictObject({
  id: z.string().min(1)
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type MemberIdentifier = z.infer<typeof memberIdentifierSchema>
export type InvitationIdentifier = z.infer<typeof invitationIdentifierSchema>
