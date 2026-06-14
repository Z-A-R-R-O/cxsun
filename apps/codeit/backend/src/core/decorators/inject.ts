import 'reflect-metadata'

export const INJECT_METADATA_KEY = Symbol('inject:params')

export function Inject(token?: any): ParameterDecorator {
  return (target, propertyKey, index) => {
    const existing: any[] =
      Reflect.getMetadata(INJECT_METADATA_KEY, target, propertyKey ?? 'constructor') ?? []

    existing[index] = token

    Reflect.defineMetadata(
      INJECT_METADATA_KEY,
      existing,
      target,
      propertyKey ?? 'constructor',
    )
  }
}
