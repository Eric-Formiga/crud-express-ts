import { Router } from 'express'
import { usersRoutes } from './users-routes'

export const routes = Router()

routes.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

routes.use('/users', usersRoutes)
