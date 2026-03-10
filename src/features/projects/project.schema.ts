import { z } from 'zod'

export const createProjectSchema = z.strictObject({
  name: z.string().min(1, 'Project name is required').max(100),
  clientName: z.string().min(1, 'Client name is required').max(100),
  clientEmail: z.email('Invalid email address')
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  clientName: z.string().min(1).max(100).optional(),
  clientEmail: z.email().optional(),
  syncInterval: z.number().int().min(5).max(60).optional()
})

export const projectIdentifierSchema = z.strictObject({
  id: z.uuid().min(1)
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectIdentifier = z.infer<typeof projectIdentifierSchema>
