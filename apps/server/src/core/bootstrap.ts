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
import { settings } from '../framework/config/index.js'

export interface AppOptions {
  host?: string
  port?: number
  logLevel?: string
  gracePeriodMs?: number
  version?: string
}

export class CxApp {
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
  ): Promise<CxApp> {
    const host = options.host ?? settings.server.host
    const port = options.port ?? settings.server.port
    const logLevel = options.logLevel ?? settings.server.logLevel
    const gracePeriodMs = options.gracePeriodMs ?? 5_000

    const app = Fastify({ bodyLimit: settings.server.bodyLimitBytes, logger: { level: logLevel } })
    const container = new Container()

    await app.register(cors, {
      origin: true,
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-tenant-code', 'x-user-email'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })

    app.addHook('onError', async (_req, _reply, error) => {
      app.log.error({ err: error })
    })

    const cxApp = new CxApp(app, container, gracePeriodMs, host, port)

    await cxApp.bootstrapModule(moduleClass)
    cxApp.registerShutdown()

    return cxApp
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: this.host })
    console.log(`\n  ✓ Server running at http://localhost:${this.port}`)
  }

  // ── Module bootstrap ──────────────────────────────────

  private async bootstrapModule(moduleClass: ClassProvider): Promise<void> {
    const metadata: ModuleMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) ?? {}

    for (const importedModule of metadata.imports ?? []) {
      await this.bootstrapModule(importedModule)
    }

    const allProviders = [...(metadata.providers ?? [])]

    if (metadata.middleware) allProviders.push(...metadata.middleware)
    if (metadata.guards) allProviders.push(...metadata.guards)
    if (metadata.controllers) allProviders.push(...metadata.controllers)

    for (const provider of allProviders) {
      this.container.register({ token: provider })
    }

    for (const controller of metadata.controllers ?? []) {
      this.registerController(controller)
    }
  }

  // ── Controller registration ──────────────────────────

  private registerController(controllerClass: ClassProvider): void {
    const prefix: string =
      Reflect.getMetadata(CONTROLLER_PREFIX_KEY, controllerClass) ?? ''
    const routes: RouteDefinition[] =
      Reflect.getMetadata(CONTROLLER_ROUTES_KEY, controllerClass) ?? []

    const instance: any = this.container.get(controllerClass)

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
            return instance[route.handlerName](...args)
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

  // ── Parameter resolution ────────────────────────────

  private resolveHandlerParams(
    prototype: any,
    handlerName: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): any[] {
    const paramDefs: ParamDefinition[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, prototype, handlerName) ?? []

    const handler: (...args: any[]) => any = prototype[handlerName]
    const paramCount = handler?.length ?? 0
    const args: any[] = new Array(paramCount).fill(undefined)

    for (const def of paramDefs) {
      switch (def.type) {
        case 'body':
          args[def.index] = def.key
            ? (request.body as Record<string, any>)?.[def.key]
            : request.body
          break
        case 'query':
          args[def.index] = def.key
            ? (request.query as Record<string, any>)?.[def.key]
            : request.query
          break
        case 'param':
          args[def.index] = def.key
            ? (request.params as Record<string, any>)?.[def.key]
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

  // ── Shutdown ─────────────────────────────────────────

  private registerShutdown(): void {
    let isShuttingDown = false

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return
      isShuttingDown = true

      console.log(`\n  ╰ Received ${signal}, shutting down gracefully...`)

      const timeout = setTimeout(() => {
        console.error('  ✗ Forced exit after timeout')
        process.exit(1)
      }, this.gracePeriodMs)

      try {
        await this.app.close()
        clearTimeout(timeout)
        console.log('  ✓ Server closed')
        process.exit(0)
      } catch (err) {
        clearTimeout(timeout)
        console.error('  ✗ Error during shutdown:', err)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    process.on('uncaughtException', (err) => {
      this.app.log.error({ err }, 'Uncaught exception')
      shutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      this.app.log.error({ err: reason }, 'Unhandled rejection')
    })
  }
}
