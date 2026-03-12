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

export async function countFeaturesByProject(projectId: string) {
  const totalFeatures = await prisma.feature.count({
    where: {
      projectId
    }
  })

  return totalFeatures
}

export async function insertFeature(
  projectId: string,
  input: CreateFeatureInput,
  order: number
) {
  const feature = await prisma.$transaction(async (tx) => {
    await tx.feature.updateMany({
      where: {
        projectId,
        order: {
          gte: order
        }
      },
      data: {
        order: {
          increment: 1
        }
      }
    })

    return tx.feature.create({
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
  })

  return feature
}

export async function updateFeatureRecord(
  featureId: string,
  projectId: string,
  currentOrder: number,
  targetOrder: number,
  input: UpdateFeatureInput
) {
  const feature = await prisma.$transaction(async (tx) => {
    if (targetOrder < currentOrder) {
      await tx.feature.updateMany({
        where: {
          projectId,
          id: {
            not: featureId
          },
          order: {
            gte: targetOrder,
            lt: currentOrder
          }
        },
        data: {
          order: {
            increment: 1
          }
        }
      })
    }

    if (targetOrder > currentOrder) {
      await tx.feature.updateMany({
        where: {
          projectId,
          id: {
            not: featureId
          },
          order: {
            lte: targetOrder,
            gt: currentOrder
          }
        },
        data: {
          order: {
            decrement: 1
          }
        }
      })
    }

    return tx.feature.update({
      where: {
        id: featureId
      },
      data: {
        name: input.name,
        order: targetOrder
      },
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    })
  })

  return feature
}

export async function deleteFeatureRecord(
  featureId: string,
  projectId: string,
  featureOrder: number
) {
  await prisma.$transaction(async (tx) => {
    await tx.feature.delete({
      where: {
        id: featureId
      }
    })

    await tx.feature.updateMany({
      where: {
        projectId,
        order: {
          gt: featureOrder
        }
      },
      data: {
        order: {
          decrement: 1
        }
      }
    })
  })
}
