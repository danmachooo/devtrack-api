import { z } from 'zod'

export const createFeatureSchema = z.strictObject({
  name: z.string().min(1, 'Feature name is required').max(100),
  order: z.number().int().min(0).optional()
})

export const updateFeatureSchema = z
  .strictObject({
    name: z.string().min(1, 'Feature name is required').max(100).optional(),
    order: z.number().int().min(0).optional()
  })
  .refine((value) => value.name !== undefined || value.order !== undefined, {
    message: 'At least one field must be provided.'
  })

export const featureIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export const featureProjectIdentifierSchema = z.strictObject({
  projectId: z.uuid().min(1)
})

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>
export type FeatureIdentifier = z.infer<typeof featureIdentifierSchema>
export type FeatureProjectIdentifier = z.infer<
  typeof featureProjectIdentifierSchema
>
