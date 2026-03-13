import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  createProjectController,
  deleteProjectController,
  getProjectClientAccessController,
  getProjectByIdController,
  getProjectsController,
  updateProjectController
} from '@/features/projects/project.controller'
import {
  createProjectSchema,
  projectIdentifierSchema,
  updateProjectSchema
} from '@/features/projects/project.schema'
import { Router } from 'express'

const router = Router()

router.get(
  '/',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  getProjectsController
)

router.get(
  '/:id',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  validateParams(projectIdentifierSchema),
  getProjectByIdController
)

router.get(
  '/:id/client-access',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(projectIdentifierSchema),
  getProjectClientAccessController
)

router.post(
  '/',
  requireRoleMiddleware('TEAM_LEADER'),
  validateBody(createProjectSchema),
  createProjectController
)

router.patch(
  '/:id',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectIdentifierSchema),
  validateBody(updateProjectSchema),
  updateProjectController
)

router.delete(
  '/:id',
  requireRoleMiddleware('TEAM_LEADER'),
  validateParams(projectIdentifierSchema),
  deleteProjectController
)

export default router
