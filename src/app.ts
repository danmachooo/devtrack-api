import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import "dotenv/config"

import { errorHandler } from '@/core/middleware/error-handler'
import { requestLogger } from '@/core/middleware/request-logger'
import { apiRouter } from '@/routes'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(requestLogger)

app.use('/api', apiRouter)

app.use(errorHandler)

export default app
