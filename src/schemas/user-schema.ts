import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must have at least 3 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Invalid email')),
  // bcrypt só considera os primeiros 72 bytes da senha
  password: z
    .string()
    .min(6, 'Password must have at least 6 characters')
    .max(72, 'Password must have at most 72 characters'),
})

export const userIdParamsSchema = z.object({
  id: z.uuid('Invalid user id'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
