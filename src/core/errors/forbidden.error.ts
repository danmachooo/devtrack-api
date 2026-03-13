import { AppError } from '@/core/errors/app.error'

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(403, message, details)
  }
}
