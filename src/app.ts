import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import "dotenv/config"

import { errorHandler } from '@/core/middleware/error-handler'
import { requestLogger } from '@/core/middleware/request-logger'
import { sendResponse } from '@/core/utils/response'
import { apiRouter } from '@/routes'
import { appConfig } from '@/config/config'

const app = express()

const frontendUrl = appConfig.frontend.url
const backendUrl = appConfig.app.url

app.use(helmet())
app.use(cors({
    origin: [frontendUrl, backendUrl],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization "]
}))
app.use(express.json())
app.use(requestLogger)

app.get('/health', (_req, res) => {
  return sendResponse(res, 200, 'Service is healthy.', {
    status: 'ok'
  })
})

app.use('/api', apiRouter)

app.use(errorHandler)

export default app
