import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  createProjectController,
  deleteProjectController,
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

router.get('/', getProjectsController)

router.get(
  '/:id',
  validateParams(projectIdentifierSchema),
  getProjectByIdController
)

router.post('/', validateBody(createProjectSchema), createProjectController)

router.patch(
  '/:id',
  validateParams(projectIdentifierSchema),
  validateBody(updateProjectSchema),
  updateProjectController
)

router.delete(
  '/:id',
  validateParams(projectIdentifierSchema),
  deleteProjectController
)

export default router
