import { Router } from 'express'
import ProjectRouter from '@/features/projects/project.routes'
import { authRouter } from '@/features/auth/auth.routes'
import {
  featureRouter,
  projectFeatureRouter
} from '@/features/features/feature.routes'
import { organizationRouter } from '@/features/organization/organization.routes'
import { requireAuthMiddleware } from '@/common/middleware/require-auth.middleware'

const apiRouter = Router()

apiRouter.use('/auth', authRouter)

apiRouter.use('/org', organizationRouter)

apiRouter.use(
  '/projects',
  requireAuthMiddleware,
  ProjectRouter
)

apiRouter.use('/projects/:projectId/features', requireAuthMiddleware, projectFeatureRouter)

apiRouter.use('/features', requireAuthMiddleware, featureRouter)

export { apiRouter }
