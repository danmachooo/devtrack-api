import type { RequestHandler } from 'express'
import type { HttpContext } from '@/core/types/http-context.types'

export const asyncHandler =
  <T extends HttpContext>(fn: (http: T) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    const http = { req, res, next } as T

    Promise.resolve(fn(http)).catch(next)
  }
