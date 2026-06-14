import 'reflect-metadata'

export const INJECTABLE_KEY = Symbol('injectable')

export function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target)
  }
}

export function isInjectable(target: any): boolean {
  return !!Reflect.getMetadata(INJECTABLE_KEY, target)
}
