import { prisma } from '@/lib/prisma'
import type {
  CreateProjectInput,
  UpdateProjectInput
} from '@/features/projects/project.schema'
import type { Project } from '@prisma/client'

export async function findProjects(userId: string): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: {
      organizationId: userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      features: true,
      clientAccess: true,
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return projects
}

export async function findProjectById(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId
    },
    include: {
      features: {
        orderBy: {
          order: 'asc'
        }
      },
      clientAccess: true,
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return project
}

export async function findProjectByIdOrThrow(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  const project = await prisma.project.findFirstOrThrow({
    where: {
      id: projectId,
      organizationId
    },
    include: {
      features: {
        orderBy: {
          order: 'asc'
        }
      },
      clientAccess: true,
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })

  return project
}

export async function insertProject(
  input: CreateProjectInput,
  userId: string,
  organizationId: string
): Promise<Project> {
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
    include: {
      clientAccess: true
    }
  })

  return project
}

export async function updateProjectRecord(
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const updated = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      name: input.name,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      syncInterval: input.syncInterval
    }
  })

  return updated
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
