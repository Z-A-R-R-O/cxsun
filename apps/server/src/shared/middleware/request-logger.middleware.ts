import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Middleware } from '../../core/interfaces/middleware.interface.js'
import { Injectable } from '../../core/decorators/injectable.js'

@Injectable()
export class RequestLoggerMiddleware implements Middleware {
  use(_request: FastifyRequest, _reply: FastifyReply): void {
    const { method, url } = _request
    const start = Date.now()

    _reply.then(
      () => {
        const duration = Date.now() - start
        console.log(`  ${method} ${url} ${_reply.statusCode} ${duration}ms`)
      },
      () => {
        const duration = Date.now() - start
        console.log(`  ${method} ${url} ${_reply.statusCode} ${duration}ms`)
      },
    )
  }
}
