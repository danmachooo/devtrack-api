import { TicketStatus } from '@prisma/client'
import { z } from 'zod'

const notionIdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[0-9a-fA-F-]{32,36}$/, 'Invalid Notion identifier.')

const statusMappingRecordSchema = z.record(
  z.string().min(1, 'Notion status is required.'),
  z.enum(TicketStatus)
)

export const projectNotionIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export const connectNotionSchema = z.strictObject({
  notionToken: z.string().min(1, 'Notion token is required.'),
  databaseId: notionIdentifierSchema
})

export const testNotionConnectionSchema = connectNotionSchema

export const saveStatusMappingSchema = z
  .strictObject({
    statusMapping: statusMappingRecordSchema
  })
  .refine((value) => Object.keys(value.statusMapping).length > 0, {
    message: 'At least one status mapping is required.',
    path: ['statusMapping']
  })

export type ProjectNotionIdentifier = z.infer<
  typeof projectNotionIdentifierSchema
>
export type ConnectNotionInput = z.infer<typeof connectNotionSchema>
export type TestNotionConnectionInput = z.infer<
  typeof testNotionConnectionSchema
>
export type SaveStatusMappingInput = z.infer<typeof saveStatusMappingSchema>
