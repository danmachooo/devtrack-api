import type { Response } from 'express'

export interface ApiResponse<T = unknown> {
  statusCode: number
  message: string
  data?: T
}

export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
) {
  const response: ApiResponse<T> = {
    statusCode,
    message,
    data
  }

  return res.status(statusCode).json(response)
}
