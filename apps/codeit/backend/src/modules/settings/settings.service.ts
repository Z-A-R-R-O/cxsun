import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { SettingsStore, type CodeItSettings } from './settings.store.js'

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SettingsStore) private readonly store: SettingsStore,
  ) {}

  async getSettings(): Promise<CodeItSettings> {
    return await this.store.get()
  }

  async updateSettings(newSettings: Partial<CodeItSettings>): Promise<CodeItSettings> {
    return await this.store.update(newSettings)
  }
}
