import { execSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

// Roda uma vez antes de todos os testes: cria o banco de teste (se não existir) e aplica as migrations
export default function setup(project: TestProject) {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, ...project.config.env },
    stdio: 'pipe', // só aparece algo se o comando falhar
  })
}
