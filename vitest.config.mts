import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vitest/config'

const testEnv = parseEnv(readFileSync('.env.test', 'utf8'))

// Proteção: os testes apagam dados, então nunca podem rodar no banco de desenvolvimento
if (!testEnv.DATABASE_URL?.includes('_test')) {
  throw new Error('DATABASE_URL in .env.test must point to a test database')
}

export default defineConfig({
  test: {
    env: testEnv,
    globalSetup: ['./src/tests/setup/global-setup.ts'],
    setupFiles: ['./src/tests/setup/setup.ts'],
    // Os testes compartilham o mesmo banco, então não podem rodar em paralelo
    fileParallelism: false,
  },
})
