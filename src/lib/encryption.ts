import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { appConfig } from '@/config/config'
import { AppError } from '@/core/errors/app.error'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const ENCRYPTION_SEGMENT_COUNT = 3

const getEncryptionKey = (): Buffer => {
  return createHash('sha256')
    .update(appConfig.notion.encryptionKey, 'utf8')
    .digest()
}

export const encrypt = (value: string): string => {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join(':')
}

export const decrypt = (value: string): string => {
  const segments = value.split(':')

  if (segments.length !== ENCRYPTION_SEGMENT_COUNT) {
    throw new AppError(500, 'Invalid encrypted value.')
  }

  const [ivSegment, authTagSegment, encryptedSegment] = segments
  const iv = Buffer.from(ivSegment, 'base64')
  const authTag = Buffer.from(authTagSegment, 'base64')
  const encrypted = Buffer.from(encryptedSegment, 'base64')

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new AppError(500, 'Invalid encrypted value.')
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    iv
  )
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])

  return decrypted.toString('utf8')
}

