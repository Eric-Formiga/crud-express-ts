import { Router } from 'express'
import { UsersController } from '../controllers/users-controller'

export const usersRoutes = Router()
const usersController = new UsersController()

usersRoutes.get('/', usersController.index)
usersRoutes.get('/:id', usersController.show)
usersRoutes.post('/', usersController.create)
usersRoutes.patch('/:id', usersController.update)
usersRoutes.delete('/:id', usersController.remove)
