import type { ErrorRequestHandler } from 'express'
import { z, ZodError } from 'zod'
import { env } from '../env'
import { Prisma } from '../generated/prisma/client'
import { AppError } from '../utils/app-error'

export const errorHandling: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    // formErrors: erros do objeto como um todo (ex.: refine); fieldErrors: erros por campo
    const { formErrors, fieldErrors } = z.flattenError(error)

    response.status(400).json({
      message: formErrors[0] ?? 'Validation error',
      issues: fieldErrors,
    })
    return
  }

  // Violação de campo @unique (ex.: duas requisições criando o mesmo email ao mesmo tempo)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    response.status(409).json({ message: 'Resource already exists' })
    return
  }

  // Registro não encontrado (ex.: apagado entre a checagem e o update/delete)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    response.status(404).json({ message: 'Resource not found' })
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
