import type { Request, Response } from 'express'
import { createUserSchema } from '../schemas/user-schema'
import { UsersService } from '../services/users-service'

const usersService = new UsersService()

export class UsersController {
  async create(request: Request, response: Response) {
    const data = createUserSchema.parse(request.body)

    const user = await usersService.create(data)

    response.status(201).json(user)
  }
}
