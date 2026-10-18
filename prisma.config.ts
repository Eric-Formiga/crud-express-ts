import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

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
    // process.env em vez do helper env(): o env() exige a variável até no `prisma generate`
    // (que não conecta no banco), quebrando o `npm install` sem .env (ex.: no CI)
    url: process.env.DATABASE_URL,
  },
})
