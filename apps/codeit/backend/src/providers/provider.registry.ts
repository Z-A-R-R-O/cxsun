import { Injectable } from '../core/decorators/injectable.js'
import { Inject } from '../core/decorators/inject.js'
import { OpenAIProvider } from './openai.provider.js'
import { OpenRouterProvider } from './openrouter.provider.js'
import { DeepSeekProvider } from './deepseek.provider.js'
import { OpenCoderProvider } from './opencoder.provider.js'
import type { LLMProvider } from './provider.types.js'

@Injectable()
export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>()

  constructor(
    @Inject(OpenAIProvider) openai: OpenAIProvider,
    @Inject(OpenRouterProvider) openrouter: OpenRouterProvider,
    @Inject(DeepSeekProvider) deepseek: DeepSeekProvider,
    @Inject(OpenCoderProvider) opencode: OpenCoderProvider,
  ) {
    this.register(openai)
    this.register(openrouter)
    this.register(deepseek)
    this.register(opencode)
  }

  register(provider: LLMProvider) {
    this.providers.set(provider.name, provider)
  }

  get(name: string): LLMProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`LLM Provider '${name}' not found.`)
    }
    return provider
  }

  list(): LLMProvider[] {
    return Array.from(this.providers.values())
  }
}
