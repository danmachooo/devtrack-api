import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { HttpContext } from '@/core/types/http-context.types'
import type { SignInInput, SignUpInput } from '@/features/auth/auth.schema'
import {
  getSession,
  signIn,
  signOut,
  signUp
} from '@/features/auth/auth.service'

const appendSetCookies = (http: HttpContext, setCookies: string[]): void => {
  for (const cookie of setCookies) {
    http.res.append('Set-Cookie', cookie)
  }
}

export const signUpController = asyncHandler(async (http: HttpContext) => {
  const body: SignUpInput = http.req.validatedBody
  const result = await signUp(http.req.headers, body)

  appendSetCookies(http, result.setCookies)
  return sendResponse(http.res, 201, 'Account has been created.', result.data)
})

export const signInController = asyncHandler(async (http: HttpContext) => {
  const body: SignInInput = http.req.validatedBody
  const result = await signIn(http.req.headers, body)

  appendSetCookies(http, result.setCookies)
  return sendResponse(http.res, 200, 'Signed in successfully.', result.data)
})

export const signOutController = asyncHandler(async (http: HttpContext) => {
  const result = await signOut(http.req.headers)

  appendSetCookies(http, result.setCookies)
  return sendResponse(http.res, 200, 'Signed out successfully.', result.data)
})

export const getSessionController = asyncHandler(async (http: HttpContext) => {
  const result = await getSession(http.req.headers)

  appendSetCookies(http, result.setCookies)
  return sendResponse(http.res, 200, 'Session retrieved successfully.', result.data)
})
