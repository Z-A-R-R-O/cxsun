import { createHmac, timingSafeEqual } from 'crypto'

export interface AuthTokenPayload {
  sub: number
  email: string
  role: string
  tenantCode: string
  superAdmin?: boolean
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'cxsun-local-dev-secret'

export function signJwt(payload: AuthTokenPayload, expiresInSeconds = 24 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(body)}`
  return `${unsigned}.${signature(unsigned)}`
}

export function verifyJwt(token?: string): AuthTokenPayload | undefined {
  if (!token) {
    return undefined
  }

  const [header, body, received] = token.split('.')

  if (!header || !body || !received) {
    return undefined
  }

  const expected = signature(`${header}.${body}`)
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return undefined
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthTokenPayload

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return undefined
  }

  return payload
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function signature(unsigned: string) {
  return createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url')
}
