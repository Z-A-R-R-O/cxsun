import 'reflect-metadata'
import { INJECT_METADATA_KEY } from './decorators/inject.js'

export type ClassProvider = new (...args: any[]) => any

interface Provider {
  token: ClassProvider
  useClass?: ClassProvider
  useValue?: unknown
  useFactory?: (...args: unknown[]) => unknown
  deps?: ClassProvider[]
}

export class Container {
  private readonly providers = new Map<ClassProvider, Provider>()
  private readonly instances = new Map<ClassProvider, unknown>()

  register(provider: Provider): void {
    this.providers.set(provider.token, provider)
  }

  get<T>(token: ClassProvider): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T
    }

    const provider = this.providers.get(token)
    if (!provider) {
      throw new Error(`No provider for token: ${token.name}`)
    }

    const instance = this.instantiate(provider)
    this.instances.set(token, instance)
    return instance as T
  }

  private instantiate(provider: Provider): unknown {
    if (provider.useValue !== undefined) {
      return provider.useValue
    }

    if (provider.useFactory) {
      const deps = (provider.deps ?? []).map((dep) => this.get(dep))
      return provider.useFactory(...deps)
    }

    const target = provider.useClass ?? provider.token
    const deps = this.resolveDependencies(target)
    return new target(...deps)
  }

  private resolveDependencies(target: ClassProvider): unknown[] {
    const injectTokens: unknown[] =
      Reflect.getMetadata(INJECT_METADATA_KEY, target, 'constructor') ??
      Reflect.getMetadata(INJECT_METADATA_KEY, target.prototype, 'constructor') ??
      []

    if (injectTokens.length > 0) {
      return injectTokens.map((token) => {
        const resolvedToken = resolveInjectToken(token)
        if (!resolvedToken) {
          throw new Error(
            `Missing @Inject() for a parameter of ${target.name}. ` +
              'Add @Inject(ServiceName) to each constructor parameter.',
          )
        }
        return this.get(resolvedToken)
      })
    }

    const paramTypes: ClassProvider[] =
      Reflect.getMetadata('design:paramtypes', target) ?? []

    return paramTypes.map((param) => {
      if (!param) {
        throw new Error(
          `Cannot resolve dependency for ${target.name}. ` +
            'Add @Inject() decorator to each constructor parameter.',
        )
      }
      return this.get(param)
    })
  }
}

function resolveInjectToken(token: unknown): ClassProvider | undefined {
  if (typeof token === 'function' && !('prototype' in token)) {
    return (token as () => ClassProvider)()
  }
  return token as ClassProvider | undefined
}
