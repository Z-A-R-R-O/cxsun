import type { FastifyRequest, FastifyReply } from 'fastify'

export interface ExceptionFilter {
  catch(
    exception: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void | Promise<void>
}
