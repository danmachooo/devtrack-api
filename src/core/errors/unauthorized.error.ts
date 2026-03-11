import { AppError } from '@/core/errors/app.error'

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(401, message, details)
  }
}
