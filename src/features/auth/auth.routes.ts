import { Router } from 'express'

import { validateBody } from '@/core/middleware/validate'
import {
  getSessionController,
  signInController,
  signOutController,
  signUpController
} from '@/features/auth/auth.controller'
import { signInSchema, signUpSchema } from '@/features/auth/auth.schema'

const authRouter = Router()

authRouter.post('/sign-up', validateBody(signUpSchema), signUpController)
authRouter.post('/sign-in', validateBody(signInSchema), signInController)
authRouter.post('/sign-out', signOutController)
authRouter.get('/session', getSessionController)

export { authRouter }
