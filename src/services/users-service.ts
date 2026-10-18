import { hash } from 'bcrypt'
import { prisma } from '../database/prisma'
import type { Prisma } from '../generated/prisma/client'
import type { CreateUserInput } from '../schemas/user-schema'
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
}
