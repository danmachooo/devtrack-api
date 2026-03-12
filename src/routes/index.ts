import { Router } from 'express'
import ProjectRouter from '@/features/projects/project.routes'
import { requireAuthMiddleware, } from '@/common/middleware/require-auth.middleware'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'

const apiRouter = Router()



apiRouter.use(
    '/projects',
    requireAuthMiddleware,
    requireRoleMiddleware("TEAM_LEADER"),
    ProjectRouter
)

export { apiRouter }
