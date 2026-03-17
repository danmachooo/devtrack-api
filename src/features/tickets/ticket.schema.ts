import { TicketStatus } from '@prisma/client'
import { z } from 'zod'

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return value
}, z.boolean())

const toNumberQueryValue = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value)
  }

  return value
}

export const ticketProjectIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export const ticketIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export const ticketFiltersSchema = z
  .strictObject({
    featureId: z.uuid().optional(),
    status: z.enum(TicketStatus).optional(),
    unassigned: booleanQuerySchema.optional(),
    showMissing: booleanQuerySchema.optional().default(false),
    page: z.preprocess(toNumberQueryValue, z.number().int().min(1)).optional().default(1),
    limit: z
      .preprocess(toNumberQueryValue, z.number().int().min(1).max(100))
      .optional()
      .default(20),
    search: z.string().trim().min(1).max(100).optional(),
    assignee: z.string().trim().min(1).max(100).optional(),
    sortBy: z
      .enum(['syncedAt', 'createdAt', 'updatedAt', 'title', 'devtrackStatus'])
      .optional()
      .default('syncedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
  .refine(
    (value) => !(value.featureId !== undefined && value.unassigned === true),
    {
      message: 'featureId and unassigned cannot be used together.'
    }
  )

export const assignTicketFeatureSchema = z.strictObject({
  featureId: z.uuid().nullable()
})

export const bulkAssignTicketFeatureSchema = z.strictObject({
  ticketIds: z.array(z.uuid()).min(1).max(100),
  featureId: z.uuid().nullable()
})

export type TicketProjectIdentifier = z.infer<
  typeof ticketProjectIdentifierSchema
>
export type TicketIdentifier = z.infer<typeof ticketIdentifierSchema>
export type TicketFilters = z.infer<typeof ticketFiltersSchema>
export type AssignTicketFeatureInput = z.infer<typeof assignTicketFeatureSchema>
export type BulkAssignTicketFeatureInput = z.infer<
  typeof bulkAssignTicketFeatureSchema
>
