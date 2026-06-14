import type { FastifyRequest, FastifyReply } from 'fastify'

export interface CanActivate {
  canActivate(
    request: FastifyRequest,
    reply: FastifyReply,
  ): boolean | Promise<boolean>
}
