import express from 'express'
import { errorHandling } from './middlewares/error-handling'
import { routes } from './routes'
import { AppError } from './utils/app-error'

export const app = express()

app.use(express.json())

app.use(routes)

app.use(() => {
  throw new AppError('Route not found', 404)
})

app.use(errorHandling)
