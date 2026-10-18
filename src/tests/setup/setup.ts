import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../../database/prisma'

// Cada teste começa com o banco vazio, sem depender da ordem dos outros
beforeEach(async () => {
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
