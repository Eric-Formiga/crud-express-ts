import { compare } from 'bcrypt'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../app'
import { prisma } from '../database/prisma'

const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000'

function makeUserData(overrides: Partial<Record<'name' | 'email' | 'password', string>> = {}) {
  return {
    name: 'John Doe',
    email: 'john@email.com',
    password: '123456',
    ...overrides,
  }
}

async function createUser(overrides: Parameters<typeof makeUserData>[0] = {}) {
  const response = await request(app).post('/users').send(makeUserData(overrides))
  return response.body as { id: string; name: string; email: string }
}

describe('POST /users', () => {
  it('should create a user without returning the password', async () => {
    const response = await request(app).post('/users').send(makeUserData())

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'John Doe',
      email: 'john@email.com',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(response.body).not.toHaveProperty('password')
  })

  it('should store the password as a bcrypt hash', async () => {
    const { id } = await createUser()

    const user = await prisma.user.findUniqueOrThrow({ where: { id } })

    expect(user.password).not.toBe('123456')
    expect(await compare('123456', user.password)).toBe(true)
  })

  it('should normalize the email (trim + lowercase)', async () => {
    const response = await request(app)
      .post('/users')
      .send(makeUserData({ email: '  John@Email.COM ' }))

    expect(response.body.email).toBe('john@email.com')
  })

  it('should not allow two users with the same email', async () => {
    await createUser()

    const response = await request(app)
      .post('/users')
      .send(makeUserData({ email: 'JOHN@email.com' }))

    expect(response.status).toBe(409)
    expect(response.body.message).toBe('Email already in use')
  })

  it('should handle concurrent requests with the same email', async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => request(app).post('/users').send(makeUserData())),
    )

    const statuses = responses.map((response) => response.status).sort()

    expect(statuses).toEqual([201, 409, 409])
    expect(await prisma.user.count()).toBe(1)
  })

  it('should validate the body', async () => {
    const response = await request(app)
      .post('/users')
      .send({ name: 'Jo', email: 'not-an-email', password: '123' })

    expect(response.status).toBe(400)
    expect(response.body.issues).toEqual({
      name: [expect.any(String)],
      email: [expect.any(String)],
      password: [expect.any(String)],
    })
  })
})

describe('GET /users', () => {
  it('should list users from newest to oldest without passwords', async () => {
    await createUser({ email: 'first@email.com' })
    await createUser({ email: 'second@email.com' })

    const response = await request(app).get('/users')

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].email).toBe('second@email.com')
    expect(response.body[1].email).toBe('first@email.com')
    expect(response.body[0]).not.toHaveProperty('password')
  })

  it('should return an empty list when there are no users', async () => {
    const response = await request(app).get('/users')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })
})

describe('GET /users/:id', () => {
  it('should return a user by id', async () => {
    const { id } = await createUser()

    const response = await request(app).get(`/users/${id}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id, name: 'John Doe', email: 'john@email.com' })
    expect(response.body).not.toHaveProperty('password')
  })

  it('should return 404 when the user does not exist', async () => {
    const response = await request(app).get(`/users/${NON_EXISTENT_ID}`)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('User not found')
  })

  it('should return 400 when the id is not a valid uuid', async () => {
    const response = await request(app).get('/users/123')

    expect(response.status).toBe(400)
    expect(response.body.issues).toHaveProperty('id')
  })
})

describe('PATCH /users/:id', () => {
  it('should update only the fields sent', async () => {
    const { id } = await createUser()

    const response = await request(app).patch(`/users/${id}`).send({ name: 'John Updated' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id, name: 'John Updated', email: 'john@email.com' })
  })

  it('should hash the new password', async () => {
    const { id } = await createUser()

    await request(app).patch(`/users/${id}`).send({ password: 'newPassword' })

    const user = await prisma.user.findUniqueOrThrow({ where: { id } })
    expect(await compare('newPassword', user.password)).toBe(true)
  })

  it('should not allow using an email that belongs to another user', async () => {
    await createUser({ email: 'taken@email.com' })
    const { id } = await createUser()

    const response = await request(app).patch(`/users/${id}`).send({ email: 'taken@email.com' })

    expect(response.status).toBe(409)
  })

  it('should allow keeping the same email', async () => {
    const { id } = await createUser()

    const response = await request(app).patch(`/users/${id}`).send({ email: 'john@email.com' })

    expect(response.status).toBe(200)
  })

  it('should require at least one field', async () => {
    const { id } = await createUser()

    const response = await request(app).patch(`/users/${id}`).send({})

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('At least one field must be provided')
  })

  it('should return 404 when the user does not exist', async () => {
    const response = await request(app).patch(`/users/${NON_EXISTENT_ID}`).send({ name: 'Nobody' })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /users/:id', () => {
  it('should delete a user', async () => {
    const { id } = await createUser()

    const response = await request(app).delete(`/users/${id}`)

    expect(response.status).toBe(204)
    expect(response.body).toEqual({})
    expect(await prisma.user.findUnique({ where: { id } })).toBeNull()
  })

  it('should return 404 when the user does not exist', async () => {
    const response = await request(app).delete(`/users/${NON_EXISTENT_ID}`)

    expect(response.status).toBe(404)
  })
})

describe('App', () => {
  it('GET /health should return ok', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route')

    expect(response.status).toBe(404)
  })

  it('should return 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send('{ invalid json')

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Malformed JSON')
  })
})
