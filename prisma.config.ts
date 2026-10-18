import { existsSync } from 'node:fs'
import { defineConfig, env } from 'prisma/config'

// O Prisma CLI não carrega o .env sozinho
if (existsSync('.env')) {
  process.loadEnvFile()
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
