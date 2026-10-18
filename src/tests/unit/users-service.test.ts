import { hash } from 'bcrypt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersService } from '../../services/users-service'
import { AppError } from '../../utils/app-error'

// Mocks: substituem o Prisma e o bcrypt por funções falsas que nós controlamos.
// vi.hoisted garante que o objeto exista antes do vi.mock (que é "içado" para o topo do arquivo)
const prismaUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../../database/prisma', () => ({
  prisma: { user: prismaUser },
}))

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
}))

const fakeUser = {
  id: '6f33cfca-cc3f-4747-8a67-f016a3b10d38',
  name: 'John Doe',
  email: 'john@email.com',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('UsersService', () => {
  let usersService: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    usersService = new UsersService()
  })

  describe('create', () => {
    const input = { name: 'John Doe', email: 'john@email.com', password: '123456' }

    it('should hash the password and save the user', async () => {
      prismaUser.findUnique.mockResolvedValue(null)
      prismaUser.create.mockResolvedValue(fakeUser)

      const user = await usersService.create(input)

      expect(hash).toHaveBeenCalledWith('123456', 10)
      expect(prismaUser.create).toHaveBeenCalledWith({
        data: { name: 'John Doe', email: 'john@email.com', password: 'hashed-password' },
        select: expect.not.objectContaining({ password: true }),
      })
      expect(user).toBe(fakeUser)
    })

    it('should throw 409 when the email is already in use', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser)

      const promise = usersService.create(input)

      await expect(promise).rejects.toBeInstanceOf(AppError)
      await expect(promise).rejects.toMatchObject({ statusCode: 409 })
      expect(hash).not.toHaveBeenCalled()
      expect(prismaUser.create).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should list users from newest to oldest', async () => {
      prismaUser.findMany.mockResolvedValue([fakeUser])

      const users = await usersService.list()

      expect(users).toEqual([fakeUser])
      expect(prismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })
  })

  describe('findById', () => {
    it('should return the user', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser)

      await expect(usersService.findById(fakeUser.id)).resolves.toBe(fakeUser)
    })

    it('should throw 404 when the user does not exist', async () => {
      prismaUser.findUnique.mockResolvedValue(null)

      await expect(usersService.findById(fakeUser.id)).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      })
    })
  })

  describe('update', () => {
    it('should update only the fields sent, without hashing when there is no password', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser)
      prismaUser.update.mockResolvedValue({ ...fakeUser, name: 'New Name' })

      await usersService.update(fakeUser.id, { name: 'New Name' })

      expect(hash).not.toHaveBeenCalled()
      expect(prismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: fakeUser.id },
          data: { name: 'New Name', email: undefined, password: undefined },
        }),
      )
    })

    it('should hash the new password', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser)

      await usersService.update(fakeUser.id, { password: 'newPassword' })

      expect(hash).toHaveBeenCalledWith('newPassword', 10)
      expect(prismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'hashed-password' }),
        }),
      )
    })

    it('should throw 409 when the email belongs to another user', async () => {
      const anotherUser = { ...fakeUser, id: 'another-id', email: 'taken@email.com' }
      prismaUser.findUnique
        .mockResolvedValueOnce(fakeUser) // findById
        .mockResolvedValueOnce(anotherUser) // busca pelo email

      await expect(
        usersService.update(fakeUser.id, { email: 'taken@email.com' }),
      ).rejects.toMatchObject({ statusCode: 409 })
      expect(prismaUser.update).not.toHaveBeenCalled()
    })

    it('should allow keeping the same email', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser) // findById e busca pelo email: o próprio usuário

      await usersService.update(fakeUser.id, { email: fakeUser.email })

      expect(prismaUser.update).toHaveBeenCalled()
    })

    it('should throw 404 when the user does not exist', async () => {
      prismaUser.findUnique.mockResolvedValue(null)

      await expect(usersService.update(fakeUser.id, { name: 'New Name' })).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(prismaUser.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should delete the user', async () => {
      prismaUser.findUnique.mockResolvedValue(fakeUser)

      await usersService.remove(fakeUser.id)

      expect(prismaUser.delete).toHaveBeenCalledWith({ where: { id: fakeUser.id } })
    })

    it('should throw 404 when the user does not exist', async () => {
      prismaUser.findUnique.mockResolvedValue(null)

      await expect(usersService.remove(fakeUser.id)).rejects.toMatchObject({ statusCode: 404 })
      expect(prismaUser.delete).not.toHaveBeenCalled()
    })
  })
})
