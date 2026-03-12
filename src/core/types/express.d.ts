import { Role } from '@prisma/client'
import 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
        role: Role
      }
      validatedBody: any
      validatedParams: any
      validatedQuery: any
    }
  }
}
