import type { IncomingHttpHeaders } from 'node:http'

import { fromNodeHeaders } from 'better-auth/node'

import { appConfig } from '@/config/config'
import { auth } from '@/lib/auth'

type AuthProxyResult<T> = {
  statusCode: number
  data: T | null
  setCookies: string[]
}

const getAuthUrl = (path: string): URL => {
  const normalizedBaseUrl = appConfig.auth.url.endsWith('/')
    ? appConfig.auth.url
    : `${appConfig.auth.url}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path

  return new URL(normalizedPath, normalizedBaseUrl)
}

const getSetCookies = (headers: Headers): string[] => {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie()
  }

  const setCookie = headers.get('set-cookie')
  return setCookie ? [setCookie] : []
}

async function proxyAuthRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  headers: IncomingHttpHeaders,
  body?: unknown
): Promise<AuthProxyResult<T>> {
  const requestHeaders = fromNodeHeaders(headers)
  const origin = headers.origin ?? appConfig.frontend.url

  requestHeaders.set('origin', origin)

  if (body !== undefined) {
    requestHeaders.set('content-type', 'application/json')
  }

  const response = await auth.handler(
    new Request(getAuthUrl(path), {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  )

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? ((await response.json()) as T)
    : null

  return {
    statusCode: response.status,
    data,
    setCookies: getSetCookies(response.headers)
  }
}

export async function signUpWithEmail(
  headers: IncomingHttpHeaders,
  body: {
    name: string
    email: string
    password: string
  }
) {
  return await proxyAuthRequest<{
    token?: string | null
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      emailVerified: boolean
      createdAt: string
      updatedAt: string
      role?: string
    }
  }>('sign-up/email', 'POST', headers, body)
}

export async function signInWithEmail(
  headers: IncomingHttpHeaders,
  body: {
    email: string
    password: string
  }
) {
  return await proxyAuthRequest<{
    redirect?: boolean
    token?: string
    url?: string
    user?: {
      id: string
      name: string
      email: string
      image?: string | null
      emailVerified: boolean
      createdAt: string
      updatedAt: string
      role?: string
    }
  }>('sign-in/email', 'POST', headers, body)
}

export async function signOutSession(headers: IncomingHttpHeaders) {
  return await proxyAuthRequest<{ success: boolean }>('sign-out', 'POST', headers)
}

export async function getCurrentSession(headers: IncomingHttpHeaders) {
  return await proxyAuthRequest<{
    session: {
      id: string
      expiresAt: string
      createdAt: string
      updatedAt: string
      userId: string
      token: string
      activeOrganizationId?: string
    }
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      emailVerified: boolean
      createdAt: string
      updatedAt: string
      role?: string
    }
  } | null>('get-session?disableCookieCache=true', 'GET', headers)
}
