import { Injectable } from '../core/decorators/injectable.js'
import { Inject } from '../core/decorators/inject.js'
import { SettingsStore } from '../modules/settings/settings.store.js'
import { OpenAIBaseProvider } from './openai-base.provider.js'

@Injectable()
export class OpenRouterProvider extends OpenAIBaseProvider {
  constructor(
    @Inject(SettingsStore) settingsStore: SettingsStore,
  ) {
    super('openrouter', settingsStore, 'google/gemini-2.5-pro')
  }
}
