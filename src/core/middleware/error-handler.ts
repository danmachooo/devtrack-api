import type { NextFunction, Request, Response } from 'express'
import { ZodError, treeifyError } from 'zod'

import { AppError } from '@/core/errors/app-error'
import { logger } from '@/core/logger/logger'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: treeifyError(err)
    })
    return
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack })
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
    return
  }

  logger.error('Unexpected error', { message: err.message, stack: err.stack })

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  })
}
