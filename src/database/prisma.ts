import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../env'
import { type Prisma, PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

const logLevels = {
  development: ['query', 'warn', 'error'],
  test: [],
  production: ['error'],
} satisfies Record<typeof env.NODE_ENV, Prisma.LogLevel[]>

export const prisma = new PrismaClient({
  adapter,
  log: logLevels[env.NODE_ENV],
})
