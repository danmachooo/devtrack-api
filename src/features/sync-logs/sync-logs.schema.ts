import { z } from 'zod'

const syncLogsLimitSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return Number(value)
  }

  return value
}, z.number().int().min(1).max(50))

export const syncLogsProjectIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export const syncLogsQuerySchema = z.strictObject({
  limit: syncLogsLimitSchema.default(10)
})

export type SyncLogsProjectIdentifier = z.infer<
  typeof syncLogsProjectIdentifierSchema
>
export type SyncLogsQuery = z.infer<typeof syncLogsQuerySchema>
