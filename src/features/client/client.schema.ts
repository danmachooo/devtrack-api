import { z } from 'zod'

export const clientTokenIdentifierSchema = z.strictObject({
  token: z.uuid().min(1)
})

export type ClientTokenIdentifier = z.infer<typeof clientTokenIdentifierSchema>
