import { describe, expect, it } from 'vitest'
import { createUserSchema, updateUserSchema, userIdParamsSchema } from '../../schemas/user-schema'

const validUser = { name: 'John Doe', email: 'john@email.com', password: '123456' }

describe('createUserSchema', () => {
  it('should accept valid data', () => {
    expect(createUserSchema.safeParse(validUser).success).toBe(true)
  })

  it('should trim and lowercase the email', () => {
    const result = createUserSchema.parse({ ...validUser, email: '  John@Email.COM  ' })

    expect(result.email).toBe('john@email.com')
  })

  it('should trim the name', () => {
    const result = createUserSchema.parse({ ...validUser, name: '  John Doe  ' })

    expect(result.name).toBe('John Doe')
  })

  it('should reject a name shorter than 3 characters (after trim)', () => {
    const result = createUserSchema.safeParse({ ...validUser, name: '  Jo  ' })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid email', () => {
    const result = createUserSchema.safeParse({ ...validUser, email: 'not-an-email' })

    expect(result.success).toBe(false)
  })

  it.each([
    { length: 5, valid: false },
    { length: 6, valid: true },
    { length: 72, valid: true },
    { length: 73, valid: false },
  ])('password with $length characters → valid: $valid', ({ length, valid }) => {
    const result = createUserSchema.safeParse({ ...validUser, password: 'a'.repeat(length) })

    expect(result.success).toBe(valid)
  })

  it('should reject missing fields', () => {
    const result = createUserSchema.safeParse({})

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'name',
      'email',
      'password',
    ])
  })

  it('should strip unknown fields', () => {
    const result = createUserSchema.parse({ ...validUser, id: 'hacked', isAdmin: true })

    expect(result).toEqual(validUser)
  })
})

describe('updateUserSchema', () => {
  it('should accept a single field', () => {
    expect(updateUserSchema.parse({ name: 'New Name' })).toEqual({ name: 'New Name' })
  })

  it('should apply the same rules as create', () => {
    expect(updateUserSchema.safeParse({ password: '123' }).success).toBe(false)
    expect(updateUserSchema.parse({ email: ' NEW@Email.com ' })).toEqual({
      email: 'new@email.com',
    })
  })

  it('should reject an empty object', () => {
    const result = updateUserSchema.safeParse({})

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('At least one field must be provided')
  })

  it('should reject an object with only unknown fields', () => {
    expect(updateUserSchema.safeParse({ id: 'hacked' }).success).toBe(false)
  })
})

describe('userIdParamsSchema', () => {
  it('should accept a valid uuid', () => {
    const id = '6f33cfca-cc3f-4747-8a67-f016a3b10d38'

    expect(userIdParamsSchema.parse({ id })).toEqual({ id })
  })

  it.each(['123', 'abc', '', '6f33cfca-cc3f-4747-8a67'])('should reject "%s"', (id) => {
    expect(userIdParamsSchema.safeParse({ id }).success).toBe(false)
  })
})
