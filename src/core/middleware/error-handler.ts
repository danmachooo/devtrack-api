import type { NextFunction, Request, Response } from 'express'
import { ZodError, treeifyError } from 'zod'

import { AppError } from '@/core/errors/app-error'
import { logger } from '@/core/logger/logger'
import { ValidationError } from '@/core/errors/validation-error'
import { sendResponse } from '@/core/utils/response'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    throw new ValidationError("Validation failed.", treeifyError(err))
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack })
    }

    sendResponse(res, err.statusCode, err.message, err.details)
  }

  logger.error('Unexpected error.', { message: err.message, stack: err.stack })

  sendResponse(res, 500, "Internal Server Error.")
}
