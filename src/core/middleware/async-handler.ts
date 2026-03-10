import type { RequestHandler } from 'express'
import type { HttpContext } from '@/core/types/http-context.types'

export const asyncHandler =
  (fn: (http: HttpContext) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    const http: HttpContext = { req, res, next }

    Promise.resolve(fn(http)).catch(next)
  }
