import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

export interface ValidationSchemas {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export interface ValidatedRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
> extends Request {
  validatedBody: TBody
  validatedParams: TParams
  validatedQuery: TQuery

}

export function validate(schemas: ValidationSchemas) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const request = req as ValidatedRequest

      if (schemas.body) {
          request.validatedBody = await schemas.body.parseAsync(req.body)
      }

      if (schemas.params) {
          request.validatedParams = await schemas.params.parseAsync(req.params)
      }

      if (schemas.query) {
          request.validatedQuery = await schemas.query.parseAsync(req.query)
      }

      next()
    } catch (err) {
      next(err) // ZodError bubbles up to errorHandler → treeifyError
    }
  }
}

// ** Validate request body only. */
export const validateBody = (schema: ZodType) => validate({ body: schema })

/** Validate route params only. */
export const validateParams = (schema: ZodType) => validate({ params: schema })

/** Validate query string only. */
export const validateQuery = (schema: ZodType) => validate({ query: schema })
