import 'reflect-metadata'

export const FILTERS_KEY = Symbol('handler:filters')

export function UseFilters(
  ...filters: (new (...args: any[]) => any)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
  ) => {
    if (propertyKey === undefined) {
      const existing: (new (...args: any[]) => any)[] =
        Reflect.getMetadata(FILTERS_KEY, target) ?? []
      Reflect.defineMetadata(FILTERS_KEY, [...existing, ...filters], target)
      return
    }

    const existing: (new (...args: any[]) => any)[] =
      Reflect.getMetadata(FILTERS_KEY, target, propertyKey) ?? []

    Reflect.defineMetadata(FILTERS_KEY, [...existing, ...filters], target, propertyKey)
  }
}
