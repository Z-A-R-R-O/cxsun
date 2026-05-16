import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CanActivate } from '../interfaces/guard.interface.js'
import { Injectable } from '../decorators/injectable.js'
import { verifyJwt } from '../../infrastructure/auth/jwt.js'

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(request: FastifyRequest, _reply: FastifyReply): boolean {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false
    }

    const token = authHeader.slice(7)
    const payload = verifyJwt(token)
    if (!payload) {
      return false
    }

    ;(request as any).user = payload
    return true
  }
}
