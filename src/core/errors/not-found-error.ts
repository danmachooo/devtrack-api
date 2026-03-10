import { AppError } from '@/core/errors/app-error'

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(404, message, details)
  }
}
