import {
  Algorithm,
  hash,
  verify,
  type Options as Argon2idOptions
} from '@node-rs/argon2'

type PasswordHashOptions = Pick<
  Argon2idOptions,
  'memoryCost' | 'timeCost' | 'parallelism' | 'outputLen' | 'algorithm'
>

type VerifyPasswordParams = {
  password: string
  hash: string
}

const defaultPasswordHashOptions: PasswordHashOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,
  timeCost: 2,
  parallelism: 4,
  outputLen: 32
} as const

export async function hashPassword(password: string): Promise<string> {
  const result = await hash(password)
  return result
}

export async function verifyPassword(
  data: VerifyPasswordParams
): Promise<boolean> {
  const { password, hash } = data

  const result = await verify(hash, password, defaultPasswordHashOptions)

  return result
}
