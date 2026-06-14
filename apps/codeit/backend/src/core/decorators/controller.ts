import 'reflect-metadata'

export const CONTROLLER_PREFIX_KEY = Symbol('controller:prefix')
export const CONTROLLER_ROUTES_KEY = Symbol('controller:routes')

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  handlerName: string
}

export function Controller(prefix = ''): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(CONTROLLER_PREFIX_KEY, prefix, target)
  }
}

function createRouteDecorator(method: RouteDefinition['method']) {
  return (path = ''): MethodDecorator => {
    return (target, propertyKey) => {
      const existing: RouteDefinition[] =
        Reflect.getMetadata(CONTROLLER_ROUTES_KEY, target.constructor) ?? []

      existing.push({ method, path, handlerName: String(propertyKey) })

      Reflect.defineMetadata(CONTROLLER_ROUTES_KEY, existing, target.constructor)
    }
  }
}

export const Get = createRouteDecorator('GET')
export const Post = createRouteDecorator('POST')
export const Put = createRouteDecorator('PUT')
export const Patch = createRouteDecorator('PATCH')
export const Delete = createRouteDecorator('DELETE')
