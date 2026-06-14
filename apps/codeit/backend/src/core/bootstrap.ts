import 'reflect-metadata'
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import cors from '@fastify/cors'

import { Container, type ClassProvider } from './container.js'
import {
  CONTROLLER_PREFIX_KEY,
  CONTROLLER_ROUTES_KEY,
  type RouteDefinition,
} from './decorators/controller.js'
import { MODULE_METADATA_KEY, type ModuleMetadata } from './decorators/module.js'
import { PARAM_METADATA_KEY, type ParamDefinition } from './decorators/http-params.js'
import { GUARDS_KEY } from './decorators/guards.js'
import { FILTERS_KEY } from './decorators/filters.js'
import type { CanActivate } from './interfaces/guard.interface.js'
import type { ExceptionFilter } from './interfaces/filter.interface.js'
import { HttpException } from './exceptions/http.exception.js'
import { sanitizeRequestParts } from './security/request-sanitizer.js'
import { settings } from '../framework/config/index.js'

export interface AppOptions {
  host?: string
  port?: number
  logLevel?: string
  gracePeriodMs?: number
}

export class CodeItApp {
  private readonly host: string
  private readonly port: number

  private constructor(
    public readonly app: FastifyInstance,
    public readonly container: Container,
    private readonly gracePeriodMs: number,
    host: string,
    port: number,
  ) {
    this.host = host
    this.port = port
  }

  static async create(
    moduleClass: ClassProvider,
    options: AppOptions = {},
  ): Promise<CodeItApp> {
    const host = options.host ?? settings.server.host
    const port = options.port ?? settings.server.port
    const gracePeriodMs = options.gracePeriodMs ?? 5_000

    const app = Fastify({ logger: false })
    const container = new Container()

    await app.register(cors, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })

    app.addHook('onRequest', async (request) => {
      console.log(`\x1b[36m[API]\x1b[0m ➔ \x1b[33m${request.method}\x1b[0m ${request.url}`)
    })

    app.addHook('onResponse', async (request, reply) => {
      const duration = reply.elapsedTime.toFixed(1)
      const statusColor = reply.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'
      console.log(`\x1b[36m[API]\x1b[0m ⚡ \x1b[33m${request.method}\x1b[0m ${request.url} ${statusColor}${reply.statusCode}\x1b[0m (${duration}ms)`)
    })

    app.addHook('onError', async (_req, _reply, error) => {
      console.error('\x1b[31m[API ERROR]\x1b[0m', error)
    })

    app.addHook('preValidation', async (request, reply) => {
      const sanitized = sanitizeRequestParts({
        body: request.body,
        params: request.params,
        query: request.query,
      })

      if (sanitized.issues.length > 0) {
        return reply.status(400).send({ error: 'Unsafe request input.', statusCode: 400 })
      }

      const mutableRequest = request as FastifyRequest & {
        body: unknown
        params: unknown
        query: unknown
      }
      mutableRequest.body = sanitized.body
      mutableRequest.params = sanitized.params
      mutableRequest.query = sanitized.query
    })

    const codeItApp = new CodeItApp(app, container, gracePeriodMs, host, port)

    await codeItApp.registerModule(moduleClass)
    await codeItApp.initControllers(moduleClass)
    codeItApp.registerShutdown()

    return codeItApp
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: this.host })
    console.log(`\n  ok CodeIt API running at http://localhost:${this.port}`)
  }

  // Module bootstrap

  private async registerModule(moduleClass: ClassProvider): Promise<void> {
    const metadata: ModuleMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) ?? {}

    for (const importedModule of metadata.imports ?? []) {
      await this.registerModule(importedModule)
    }

    const allProviders = [...(metadata.providers ?? [])]

    if (metadata.middleware) allProviders.push(...metadata.middleware)
    if (metadata.guards) allProviders.push(...metadata.guards)
    if (metadata.controllers) allProviders.push(...metadata.controllers)

    for (const provider of allProviders) {
      this.container.register({ token: provider })
    }
  }

  private async initControllers(moduleClass: ClassProvider): Promise<void> {
    const metadata: ModuleMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) ?? {}

    for (const importedModule of metadata.imports ?? []) {
      await this.initControllers(importedModule)
    }

    for (const controller of metadata.controllers ?? []) {
      this.registerController(controller)
    }
  }

  // Controller registration

  private registerController(controllerClass: ClassProvider): void {
    const prefix: string =
      Reflect.getMetadata(CONTROLLER_PREFIX_KEY, controllerClass) ?? ''
    const routes: RouteDefinition[] =
      Reflect.getMetadata(CONTROLLER_ROUTES_KEY, controllerClass) ?? []

    const instance: Record<string, (...args: unknown[]) => unknown> =
      this.container.get(controllerClass)

    const controllerGuards: ClassProvider[] =
      Reflect.getMetadata(GUARDS_KEY, controllerClass) ?? []

    const controllerFilters: ClassProvider[] =
      Reflect.getMetadata(FILTERS_KEY, controllerClass) ?? []

    for (const route of routes) {
      const handlerGuards: ClassProvider[] =
        Reflect.getMetadata(GUARDS_KEY, controllerClass.prototype, route.handlerName) ?? []

      const handlerFilters: ClassProvider[] =
        Reflect.getMetadata(FILTERS_KEY, controllerClass.prototype, route.handlerName) ?? []

      const path = `/${[prefix, route.path].filter(Boolean).join('/')}`.replace(/\/+/g, '/')

      this.app.route({
        method: route.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: path,
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
          const guards = [...controllerGuards, ...handlerGuards]
          for (const Guard of guards) {
            const guardInstance: CanActivate = this.container.get(Guard)
            const allowed = await guardInstance.canActivate(request, reply)
            if (!allowed) {
              return reply.status(403).send({ error: 'Forbidden' })
            }
          }

          try {
            const args = this.resolveHandlerParams(
              controllerClass.prototype,
              route.handlerName,
              request,
              reply,
            )
            return await instance[route.handlerName](...args)
          } catch (err: unknown) {
            const allFilters = [...controllerFilters, ...handlerFilters]
            for (const Filter of allFilters) {
              const filterInstance: ExceptionFilter = this.container.get(Filter)
              await filterInstance.catch(err, request, reply)
              return
            }

            if (err instanceof HttpException) {
              return reply
                .status(err.statusCode)
                .send({ error: err.message, statusCode: err.statusCode })
            }

            throw err
          }
        },
      })
    }
  }

  // Parameter resolution

  private resolveHandlerParams(
    prototype: Record<string, (...args: unknown[]) => unknown>,
    handlerName: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): unknown[] {
    const paramDefs: ParamDefinition[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, prototype, handlerName) ?? []

    const handler = prototype[handlerName]
    const paramCount = handler?.length ?? 0
    const args: unknown[] = new Array(paramCount).fill(undefined)

    for (const def of paramDefs) {
      switch (def.type) {
        case 'body':
          args[def.index] = def.key
            ? (request.body as Record<string, unknown>)?.[def.key]
            : request.body
          break
        case 'query':
          args[def.index] = def.key
            ? (request.query as Record<string, unknown>)?.[def.key]
            : request.query
          break
        case 'param':
          args[def.index] = def.key
            ? (request.params as Record<string, unknown>)?.[def.key]
            : request.params
          break
        case 'headers':
          args[def.index] = def.key
            ? request.headers?.[def.key]
            : request.headers
          break
        case 'request':
          args[def.index] = request
          break
        case 'reply':
          args[def.index] = reply
          break
      }
    }

    return args
  }

  // Shutdown

  private registerShutdown(): void {
    let isShuttingDown = false

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return
      isShuttingDown = true

      console.log(`\n  Received ${signal}, shutting down gracefully...`)

      const timeout = setTimeout(() => {
        console.error('  x Forced exit after timeout')
        process.exit(1)
      }, this.gracePeriodMs)

      try {
        await this.app.close()
        clearTimeout(timeout)
        console.log('  ok Server closed')
        process.exit(0)
      } catch (err) {
        clearTimeout(timeout)
        console.error('  x Error during shutdown:', err)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    process.on('uncaughtException', (err) => {
      this.app.log.error({ err }, 'Uncaught exception')
      void shutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      this.app.log.error({ err: reason }, 'Unhandled rejection')
    })
  }
}
