import { prisma } from '@/lib/prisma'
import type {
  CreateFeatureInput,
  UpdateFeatureInput
} from '@/features/features/feature.schema'

export async function findFeaturesByProject(projectId: string) {
  const features = await prisma.feature.findMany({
    where: {
      projectId
    },
    orderBy: {
      order: 'asc'
    },
    include: {
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return features
}

export async function findFeatureById(featureId: string) {
  const feature = await prisma.feature.findUnique({
    where: {
      id: featureId
    },
    include: {
      project: {
        select: {
          id: true,
          createdById: true,
          organizationId: true
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return feature
}

export async function findLastFeatureByOrder(projectId: string) {
  const feature = await prisma.feature.findFirst({
    where: {
      projectId
    },
    orderBy: {
      order: 'desc'
    }
  })

  return feature
}

export async function insertFeature(
  projectId: string,
  input: CreateFeatureInput,
  order: number
) {
  const feature = await prisma.feature.create({
    data: {
      name: input.name,
      order,
      projectId
    },
    include: {
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return feature
}

export async function updateFeatureRecord(
  featureId: string,
  input: UpdateFeatureInput
) {
  const feature = await prisma.feature.update({
    where: {
      id: featureId
    },
    data: {
      name: input.name,
      order: input.order
    },
    include: {
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return feature
}

export async function deleteFeatureRecord(featureId: string) {
  await prisma.feature.delete({
    where: {
      id: featureId
    }
  })
}
