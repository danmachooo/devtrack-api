import { Router } from 'express'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  createFeatureController,
  deleteFeatureController,
  getFeaturesController,
  updateFeatureController
} from '@/features/features/feature.controller'
import {
  createFeatureSchema,
  featureIdentifierSchema,
  featureProjectIdentifierSchema,
  updateFeatureSchema
} from '@/features/features/feature.schema'

const projectFeatureRouter = Router({ mergeParams: true })
const featureRouter = Router()

projectFeatureRouter.get(
  '/',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  validateParams(featureProjectIdentifierSchema),
  getFeaturesController
)

projectFeatureRouter.post(
  '/',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(featureProjectIdentifierSchema),
  validateBody(createFeatureSchema),
  createFeatureController
)

featureRouter.patch(
  '/:id',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(featureIdentifierSchema),
  validateBody(updateFeatureSchema),
  updateFeatureController
)

featureRouter.delete(
  '/:id',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(featureIdentifierSchema),
  deleteFeatureController
)

export { featureRouter, projectFeatureRouter }
