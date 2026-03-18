import { prisma } from '@/lib/prisma'
import type {
  CreateProjectInput,
  UpdateProjectInput
} from '@/features/projects/project.schema'
import type { Prisma, Project, TicketStatus } from '@prisma/client'

const safeProjectSelect = {
  id: true,
  name: true,
  clientName: true,
  clientEmail: true,
  notionDatabaseId: true,
  statusMapping: true,
  syncInterval: true,
  lastSyncedAt: true,
  organizationId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  clientAccess: {
    select: {
      id: true,
      projectId: true,
      lastViewedAt: true,
      createdAt: true
    }
  },
  _count: {
    select: {
      tickets: true
    }
  }
} satisfies Prisma.ProjectSelect

const safeProjectWithOrderedFeaturesSelect = {
  ...safeProjectSelect,
  features: {
    orderBy: {
      order: 'asc'
    }
  }
} satisfies Prisma.ProjectSelect

const safeProjectWithFeaturesSelect = {
  ...safeProjectSelect,
  features: true
} satisfies Prisma.ProjectSelect

export type SafeProject = Prisma.ProjectGetPayload<{
  select: typeof safeProjectWithFeaturesSelect
}>

export type SafeProjectWithOrderedFeatures = Prisma.ProjectGetPayload<{
  select: typeof safeProjectWithOrderedFeaturesSelect
}>

export type ProjectProgressSummaryFeatureRecord = {
  id: string
  name: string
  order: number
  projectId: string
}

export type ProjectProgressSummaryTicketRecord = {
  projectId: string
  featureId: string | null
  isMissingFromSource: boolean
  devtrackStatus: TicketStatus
}

export async function findProjects(userId: string): Promise<SafeProject[]> {
  const projects = await prisma.project.findMany({
    where: {
      organizationId: userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: safeProjectWithFeaturesSelect
  })

  return projects
}

export async function findProjectProgressSummaryRecords(projectIds: string[]) {
  if (projectIds.length === 0) {
    return {
      features: [] as ProjectProgressSummaryFeatureRecord[],
      tickets: [] as ProjectProgressSummaryTicketRecord[]
    }
  }

  const [features, tickets] = await prisma.$transaction([
    prisma.feature.findMany({
      where: {
        projectId: {
          in: projectIds
        }
      },
      select: {
        id: true,
        name: true,
        order: true,
        projectId: true
      }
    }),
    prisma.ticket.findMany({
      where: {
        projectId: {
          in: projectIds
        }
      },
      select: {
        projectId: true,
        featureId: true,
        isMissingFromSource: true,
        devtrackStatus: true
      }
    })
  ])

  return {
    features,
    tickets
  }
}

export async function findProjectById(
  projectId: string,
  organizationId: string
): Promise<SafeProjectWithOrderedFeatures | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId
    },
    select: safeProjectWithOrderedFeaturesSelect
  })

  return project
}

export async function findProjectByIdWithSecrets(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId
    }
  })
}

export async function findProjectRecordById(
  projectId: string
): Promise<Pick<Project, 'id'> | null> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId
    },
    select: {
      id: true
    }
  })

  return project
}

export async function findProjectByIdOrThrow(
  projectId: string,
  organizationId: string
): Promise<SafeProjectWithOrderedFeatures | null> {
  const project = await prisma.project.findFirstOrThrow({
    where: {
      id: projectId,
      organizationId
    },
    select: safeProjectWithOrderedFeaturesSelect
  })

  return project
}

export async function insertProject(
  input: CreateProjectInput,
  userId: string,
  organizationId: string
): Promise<SafeProject> {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      organizationId,
      createdById: userId,
      clientAccess: {
        create: {}
      }
    },
    select: safeProjectWithFeaturesSelect
  })

  return project
}

export async function updateProjectRecord(
  projectId: string,
  input: UpdateProjectInput
): Promise<SafeProject> {
  const updated = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      name: input.name,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      syncInterval: input.syncInterval
    },
    select: safeProjectWithFeaturesSelect
  })

  return updated
}

export async function updateProjectNotionConnection(
  projectId: string,
  notionToken: string,
  notionDatabaseId: string
): Promise<Project> {
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      notionToken,
      notionDatabaseId
    }
  })

  return updatedProject
}

export async function updateProjectStatusMapping(
  projectId: string,
  statusMapping: Record<string, TicketStatus>
): Promise<Project> {
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      statusMapping: statusMapping as Prisma.InputJsonObject
    }
  })

  return updatedProject
}

export async function deleteProjectRecord(
  projectId: string,
  organizationId: string
): Promise<void> {
  await prisma.project.delete({
    where: {
      id: projectId,
      organizationId
    }
  })
}

export async function findProjectClientAccessById(
  projectId: string,
  organizationId: string
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId
    },
    select: {
      id: true,
      clientAccess: {
        select: {
          id: true,
          token: true,
          projectId: true,
          lastViewedAt: true,
          createdAt: true
        }
      }
    }
  })
}
