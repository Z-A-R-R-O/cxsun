import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ExceptionFilter } from '../../core/interfaces/filter.interface.js'
import { HttpException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'

@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, _request: FastifyRequest, reply: FastifyReply): void {
    if (exception instanceof HttpException) {
      reply.status(exception.statusCode).send({
        error: exception.message,
        statusCode: exception.statusCode,
      })
      return
    }

    const statusCode = 500
    reply.status(statusCode).send({
      error: 'Internal Server Error',
      statusCode,
    })
  }
}
