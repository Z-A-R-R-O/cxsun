import 'reflect-metadata'

export const GUARDS_KEY = Symbol('handler:guards')

export function UseGuards(
  ...guards: (new (...args: any[]) => any)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
  ) => {
    if (propertyKey === undefined) {
      const existing: (new (...args: any[]) => any)[] =
        Reflect.getMetadata(GUARDS_KEY, target) ?? []
      Reflect.defineMetadata(GUARDS_KEY, [...existing, ...guards], target)
      return
    }

    const existing: (new (...args: any[]) => any)[] =
      Reflect.getMetadata(GUARDS_KEY, target, propertyKey) ?? []

    Reflect.defineMetadata(GUARDS_KEY, [...existing, ...guards], target, propertyKey)
  }
}
