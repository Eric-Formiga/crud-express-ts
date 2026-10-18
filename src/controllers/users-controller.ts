import type { Request, Response } from 'express'
import { createUserSchema, updateUserSchema, userIdParamsSchema } from '../schemas/user-schema'
import { UsersService } from '../services/users-service'

const usersService = new UsersService()

export class UsersController {
  async index(_request: Request, response: Response) {
    const users = await usersService.list()

    response.json(users)
  }

  async show(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params)

    const user = await usersService.findById(id)

    response.json(user)
  }

  async create(request: Request, response: Response) {
    const data = createUserSchema.parse(request.body)

    const user = await usersService.create(data)

    response.status(201).json(user)
  }

  async update(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params)
    const data = updateUserSchema.parse(request.body)

    const user = await usersService.update(id, data)

    response.json(user)
  }

  async remove(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params)

    await usersService.remove(id)

    response.status(204).send()
  }
}
