import { Router } from 'express'
import ProjectRouter from '@/features/projects/project.routes'
import { authRouter } from '@/features/auth/auth.routes'
import { clientRouter } from '@/features/client/client.routes'
import {
  featureRouter,
  projectFeatureRouter
} from '@/features/features/feature.routes'
import { notionRouter } from '@/features/notion/notion.routes'
import { organizationRouter } from '@/features/organization/organization.routes'
import {
  projectTicketRouter,
  ticketRouter
} from '@/features/tickets/ticket.routes'
import { requireAuthMiddleware } from '@/common/middleware/require-auth.middleware'

const apiRouter = Router()

apiRouter.use('/auth', authRouter)

apiRouter.use('/org', organizationRouter)

apiRouter.use('/client', clientRouter)

apiRouter.use(
  '/projects',
  requireAuthMiddleware,
  ProjectRouter
)

apiRouter.use('/projects/:projectId/features', requireAuthMiddleware, projectFeatureRouter)

apiRouter.use('/projects/:id/notion', requireAuthMiddleware, notionRouter)

apiRouter.use('/projects/:id/tickets', requireAuthMiddleware, projectTicketRouter)

apiRouter.use('/features', requireAuthMiddleware, featureRouter)

apiRouter.use('/tickets', requireAuthMiddleware, ticketRouter)

export { apiRouter }
