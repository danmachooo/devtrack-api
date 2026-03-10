import { AppError } from '@/core/errors/app-error'

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details)
  }
}
