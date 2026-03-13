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
    showMissing: booleanQuerySchema.optional().default(false)
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

export type TicketProjectIdentifier = z.infer<
  typeof ticketProjectIdentifierSchema
>
export type TicketIdentifier = z.infer<typeof ticketIdentifierSchema>
export type TicketFilters = z.infer<typeof ticketFiltersSchema>
export type AssignTicketFeatureInput = z.infer<typeof assignTicketFeatureSchema>
