import { z } from 'zod'

export const signUpSchema = z.strictObject({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
})

export const signInSchema = z.strictObject({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
