import 'reflect-metadata'

export const MODULE_METADATA_KEY = Symbol('module:metadata')

export interface ModuleMetadata {
  controllers?: (new (...args: any[]) => any)[]
  providers?: (new (...args: any[]) => any)[]
  imports?: (new (...args: any[]) => any)[]
  exports?: (new (...args: any[]) => any)[]
  middleware?: (new (...args: any[]) => any)[]
  guards?: (new (...args: any[]) => any)[]
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target)
  }
}

export function getModuleMetadata(target: any): ModuleMetadata {
  return Reflect.getMetadata(MODULE_METADATA_KEY, target) ?? {}
}
