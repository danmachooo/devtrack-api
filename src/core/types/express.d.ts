import 'express'

declare global {
  namespace Express {
    interface Request {
      user: {
        userId
      }
      validatedBody: any
      validatedParams: any
      validatedQuery: any
    }
  }
}
