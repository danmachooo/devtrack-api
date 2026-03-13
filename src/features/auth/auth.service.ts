import type { IncomingHttpHeaders } from 'node:http'

import { AppError } from '@/core/errors/app.error'
import { prisma } from '@/lib/prisma'
import type { SignInInput, SignUpInput } from '@/features/auth/auth.schema'
import {
  getCurrentSession,
  signInWithEmail,
  signOutSession,
  signUpWithEmail
} from '@/features/auth/auth.repo'
import { setActiveOrganizationRecord } from '@/features/organization/organization.repo'

type AuthServiceResult<T> = {
  statusCode: number
  data: T
  setCookies: string[]
}

const applySetCookiesToHeaders = (
  headers: IncomingHttpHeaders,
  setCookies: string[]
): IncomingHttpHeaders => {
  if (setCookies.length === 0) {
    return headers
  }

  const cookieMap = new Map<string, string>()
  const existingCookieHeader = headers.cookie

  if (typeof existingCookieHeader === 'string') {
    for (const cookie of existingCookieHeader.split(';')) {
      const [name, ...valueParts] = cookie.trim().split('=')

      if (!name || valueParts.length === 0) {
        continue
      }

      cookieMap.set(name, valueParts.join('='))
    }
  }

  for (const setCookie of setCookies) {
    const [cookiePair] = setCookie.split(';')
    const [name, ...valueParts] = cookiePair.trim().split('=')

    if (!name || valueParts.length === 0) {
      continue
    }

    cookieMap.set(name, valueParts.join('='))
  }

  return {
    ...headers,
    cookie: Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }
}

type AuthUser = {
  id: string
  name: string
  email: string
  image?: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  role?: string
}

const getErrorMessage = (data: unknown, fallback: string): string => {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  return fallback
}

const getErrorDetails = (data: unknown): unknown => {
  if (!data || typeof data !== "object") {
    return undefined
  }

  return data
}

const getSanitizedUser = (user: AuthUser | undefined | null) => {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role
  }
}

const getSingleOrganizationMembership = async (userId: string) => {
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: {
      organizationId: true,
      role: true
    },
    take: 2,
    orderBy: {
      createdAt: 'asc'
    }
  })

  if (memberships.length !== 1) {
    return null
  }

  return memberships[0]
}

export async function signUp(
  headers: IncomingHttpHeaders,
  input: SignUpInput
): Promise<
  AuthServiceResult<{ user: NonNullable<ReturnType<typeof getSanitizedUser>> }>
> {
  const result = await signUpWithEmail(headers, input)

  if (result.statusCode >= 400 || !result.data?.user) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to create account.'),
      getErrorDetails(result.data)
    )
  }

  const sanitizedUser = getSanitizedUser(result.data.user)

  if (!sanitizedUser) {
    throw new AppError(result.statusCode, 'Unable to create account.')
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      user: sanitizedUser
    }
  }
}

export async function signIn(
  headers: IncomingHttpHeaders,
  input: SignInInput
): Promise<
  AuthServiceResult<{
    user: NonNullable<ReturnType<typeof getSanitizedUser>>
    redirect: boolean
    url?: string
  }>
> {
  const result = await signInWithEmail(headers, input)

  if (result.statusCode >= 400 || !result.data?.user) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to sign in.'),
      getErrorDetails(result.data)
    )
  }

  const sanitizedUser = getSanitizedUser(result.data.user)

  if (!sanitizedUser) {
    throw new AppError(result.statusCode, 'Unable to sign in.')
  }

  const membership = await getSingleOrganizationMembership(sanitizedUser.id)
  let setCookies = result.setCookies

  if (membership) {
    const headersWithUpdatedCookies = applySetCookiesToHeaders(
      headers,
      result.setCookies
    )
    const activeOrganization = await setActiveOrganizationRecord(
      headersWithUpdatedCookies,
      {
        organizationId: membership.organizationId
      }
    )

    if (activeOrganization.statusCode >= 400) {
      throw new AppError(
        activeOrganization.statusCode,
        getErrorMessage(
          activeOrganization.data,
          'Signed in but active organization could not be restored.'
        )
      )
    }

    setCookies = [...result.setCookies, ...activeOrganization.setCookies]
  }

  return {
    statusCode: result.statusCode,
    setCookies,
    data: {
      user: sanitizedUser,
      redirect: result.data.redirect ?? false,
      url: result.data.url
    }
  }
}

export async function signOut(
  headers: IncomingHttpHeaders
): Promise<AuthServiceResult<{ success: boolean }>> {
  const result = await signOutSession(headers)

  if (result.statusCode >= 400 || !result.data) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to sign out.'),
      getErrorDetails(result.data)
    )
  }

  return {
    statusCode: result.statusCode,
    setCookies: result.setCookies,
    data: {
      success: result.data.success
    }
  }
}

export async function getSession(headers: IncomingHttpHeaders): Promise<
  AuthServiceResult<{
    session: {
      expiresAt: string
      activeOrganizationId?: string
    } | null
    user: ReturnType<typeof getSanitizedUser> | null
  }>
> {
  const result = await getCurrentSession(headers)

  if (result.statusCode >= 400) {
    throw new AppError(
      result.statusCode,
      getErrorMessage(result.data, 'Unable to retrieve session.'),
      getErrorDetails(result.data)
    )
  }

  if (!result.data) {
    return {
      statusCode: result.statusCode,
      setCookies: result.setCookies,
      data: {
        session: null,
        user: null
      }
    }
  }

  let activeOrganizationId = result.data.session.activeOrganizationId
  let setCookies = result.setCookies

  if (!activeOrganizationId) {
    const membership = await getSingleOrganizationMembership(result.data.user.id)

    if (membership) {
      const headersWithUpdatedCookies = applySetCookiesToHeaders(
        headers,
        result.setCookies
      )
      const activeOrganization = await setActiveOrganizationRecord(
        headersWithUpdatedCookies,
        {
          organizationId: membership.organizationId
        }
      )

      if (activeOrganization.statusCode >= 400) {
        throw new AppError(
          activeOrganization.statusCode,
          getErrorMessage(
            activeOrganization.data,
            'Session exists but active organization could not be restored.'
          )
        )
      }

      activeOrganizationId = membership.organizationId
      setCookies = [...result.setCookies, ...activeOrganization.setCookies]
    }
  }

  const membership = activeOrganizationId
    ? await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrganizationId,
            userId: result.data.user.id
          }
        }
      })
    : null

  const sanitizedUser = getSanitizedUser(result.data.user)

  if (!sanitizedUser) {
    throw new AppError(result.statusCode, 'Unable to retrieve session.')
  }

  return {
    statusCode: result.statusCode,
    setCookies,
    data: {
      session: {
        expiresAt: result.data.session.expiresAt,
        activeOrganizationId
      },
      user: {
        ...sanitizedUser,
        role: membership?.role ?? result.data.user.role
      }
    }
  }
}
