import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CanActivate } from '../interfaces/guard.interface.js'
import { Injectable } from '../decorators/injectable.js'
import { verifyJwt, type AuthTokenPayload } from '../../infrastructure/auth/jwt.js'
import { getDatabase } from '../../infrastructure/database/connection.js'

@Injectable()
export class AuthAnyGuard implements CanActivate {
  async canActivate(request: FastifyRequest, _reply: FastifyReply): Promise<boolean> {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false
    }

    const payload = verifyJwt(authHeader.slice(7))
    if (!payload) {
      return false
    }

    if (payload.identitySource === 'platform' && !await isPlatformTokenFresh(payload)) {
      return false
    }

    ;(request as any).user = payload
    return true
  }
}

async function isPlatformTokenFresh(payload: AuthTokenPayload) {
  if (!payload.iat) {
    return false
  }

  const user = await getDatabase()
    .selectFrom('admin_users')
    .select(['id', 'email', 'role', 'status', 'updated_at'])
    .where('id', '=', payload.sub)
    .where('email', '=', payload.email)
    .executeTakeFirst()

  if (!user || user.status !== 'active' || user.role !== payload.role) {
    return false
  }

  return payload.iat >= timestampSeconds(user.updated_at)
}

function timestampSeconds(value: Date | string) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0
}
