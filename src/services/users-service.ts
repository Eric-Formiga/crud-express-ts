import { hash } from 'bcrypt'
import { prisma } from '../database/prisma'
import type { Prisma } from '../generated/prisma/client'
import type { CreateUserInput, UpdateUserInput } from '../schemas/user-schema'
import { AppError } from '../utils/app-error'

const PASSWORD_SALT_ROUNDS = 10

// Campos devolvidos para o cliente: a senha nunca sai daqui
const userPublicFields = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export class UsersService {
  async create({ name, email, password }: CreateUserInput) {
    const userWithSameEmail = await prisma.user.findUnique({ where: { email } })

    if (userWithSameEmail) {
      throw new AppError('Email already in use', 409)
    }

    const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS)

    return prisma.user.create({
      data: { name, email, password: passwordHash },
      select: userPublicFields,
    })
  }

  async list() {
    return prisma.user.findMany({
      select: userPublicFields,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicFields,
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    return user
  }

  async update(id: string, { name, email, password }: UpdateUserInput) {
    await this.findById(id)

    if (email) {
      const userWithSameEmail = await prisma.user.findUnique({ where: { email } })

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        throw new AppError('Email already in use', 409)
      }
    }

    const passwordHash = password ? await hash(password, PASSWORD_SALT_ROUNDS) : undefined

    // Campos undefined são ignorados pelo Prisma (não são alterados)
    return prisma.user.update({
      where: { id },
      data: { name, email, password: passwordHash },
      select: userPublicFields,
    })
  }

  async remove(id: string) {
    await this.findById(id)

    await prisma.user.delete({ where: { id } })
  }
}
