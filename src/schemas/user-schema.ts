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

// Todos os campos opcionais, mas pelo menos um precisa ser enviado
export const updateUserSchema = createUserSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided')

export const userIdParamsSchema = z.object({
  id: z.uuid('Invalid user id'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
