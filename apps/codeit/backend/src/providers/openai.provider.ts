import { Injectable } from '../core/decorators/injectable.js'
import { Inject } from '../core/decorators/inject.js'
import { SettingsStore } from '../modules/settings/settings.store.js'
import { OpenAIBaseProvider } from './openai-base.provider.js'

@Injectable()
export class OpenAIProvider extends OpenAIBaseProvider {
  constructor(
    @Inject(SettingsStore) settingsStore: SettingsStore,
  ) {
    super('openai', settingsStore, 'gpt-4o')
  }
}
