import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import type {
  CreateFeatureInput,
  FeatureIdentifier,
  FeatureProjectIdentifier,
  UpdateFeatureInput
} from '@/features/features/feature.schema'
import {
  createFeature,
  deleteFeature,
  listFeatures,
  updateFeature
} from '@/features/features/features.service'

export const getFeaturesController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: FeatureProjectIdentifier = http.req.validatedParams

    const result = await listFeatures(
      project.projectId,
      http.req.user.organizationId
    )

    return sendResponse(http.res, 200, 'Features have been found.', result)
  }
)

export const createFeatureController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: FeatureProjectIdentifier = http.req.validatedParams
    const body: CreateFeatureInput = http.req.validatedBody

    const result = await createFeature(
      project.projectId,
      http.req.user.organizationId,
      body
    )

    return sendResponse(http.res, 201, 'Feature has been created.', result)
  }
)

export const updateFeatureController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const feature: FeatureIdentifier = http.req.validatedParams
    const body: UpdateFeatureInput = http.req.validatedBody

    const result = await updateFeature(
      feature.id,
      http.req.user.organizationId,
      body
    )

    return sendResponse(http.res, 200, 'Feature has been updated.', result)
  }
)

export const deleteFeatureController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const feature: FeatureIdentifier = http.req.validatedParams

    await deleteFeature(feature.id, http.req.user.organizationId)

    return sendResponse(http.res, 200, 'Feature has been deleted.')
  }
)
