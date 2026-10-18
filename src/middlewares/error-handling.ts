import type { ErrorRequestHandler } from 'express'
import { z, ZodError } from 'zod'
import { env } from '../env'
import { AppError } from '../utils/app-error'

export const errorHandling: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Validation error',
      issues: z.flattenError(error).fieldErrors,
    })
    return
  }

  // JSON malformado no body (lançado pelo express.json())
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ message: 'Malformed JSON' })
    return
  }

  if (env.NODE_ENV !== 'test') {
    console.error(error)
  }

  response.status(500).json({ message: 'Internal server error' })
}
