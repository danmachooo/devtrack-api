import { z } from 'zod'

export const userIdentifierSchema = z.strictObject({
  id: z.string().min(1)
})

export type UserIdentifier = z.infer<typeof userIdentifierSchema>
