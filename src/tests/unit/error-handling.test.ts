import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Prisma } from '../../generated/prisma/client'
import { errorHandling } from '../../middlewares/error-handling'
import { AppError } from '../../utils/app-error'

// Response falsa: status() devolve o próprio objeto para permitir response.status(400).json(...)
function makeResponse() {
  const response = { status: vi.fn(), json: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}

function handle(error: unknown) {
  const response = makeResponse()
  errorHandling(error, {} as Request, response as unknown as Response, vi.fn())
  return response
}

function makePrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: Prisma.prismaVersion.client,
  })
}

describe('errorHandling middleware', () => {
  it('should use the status code and message of an AppError', () => {
    const response = handle(new AppError('User not found', 404))

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({ message: 'User not found' })
  })

  it('should default AppError to status 400', () => {
    const response = handle(new AppError('Bad request'))

    expect(response.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 with field errors for a ZodError', () => {
    const result = z.object({ name: z.string() }).safeParse({})

    const response = handle(result.error)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: 'Validation error',
      issues: { name: [expect.any(String)] },
    })
  })

  it('should use the object-level ZodError message (e.g. refine)', () => {
    const result = z
      .object({})
      .refine(() => false, 'Custom rule failed')
      .safeParse({})

    const response = handle(result.error)

    expect(response.json).toHaveBeenCalledWith({ message: 'Custom rule failed', issues: {} })
  })

  it('should return 409 for a Prisma unique constraint error (P2002)', () => {
    const response = handle(makePrismaError('P2002'))

    expect(response.status).toHaveBeenCalledWith(409)
  })

  it('should return 404 for a Prisma record not found error (P2025)', () => {
    const response = handle(makePrismaError('P2025'))

    expect(response.status).toHaveBeenCalledWith(404)
  })

  it('should return 500 for other Prisma errors', () => {
    const response = handle(makePrismaError('P1001'))

    expect(response.status).toHaveBeenCalledWith(500)
  })

  it('should return 400 for malformed JSON', () => {
    const error = Object.assign(new SyntaxError('Unexpected token'), { body: '{ invalid' })

    const response = handle(error)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({ message: 'Malformed JSON' })
  })

  it('should return 500 without leaking details for unknown errors', () => {
    const response = handle(new Error('database password is 1234'))

    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith({ message: 'Internal server error' })
  })
})
