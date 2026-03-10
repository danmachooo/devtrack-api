import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler
} from 'express'

export type HttpContext = {
  req: Request
  res: Response
  next?: NextFunction
  err?: ErrorRequestHandler
}
