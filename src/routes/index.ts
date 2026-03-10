import { Router } from 'express'
import ProjectRouter from '@/features/projects/project.routes'

const apiRouter = Router()

apiRouter.use('/projects', ProjectRouter)

export { apiRouter }
