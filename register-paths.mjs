import { fileURLToPath } from 'node:url'
import path from 'node:path'
import tsconfigPaths from 'tsconfig-paths'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const baseUrl = path.join(__dirname, 'dist')

tsconfigPaths.register({
  baseUrl,
  paths: {
    '@/*': ['*']
  }
})
