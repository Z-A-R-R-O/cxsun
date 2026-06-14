import { Controller, Get, Put } from '../../core/decorators/controller.js'
import { Body } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { SettingsService } from './settings.service.js'
import type { CodeItSettings } from './settings.store.js'

@Controller('api/v1/settings')
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  @Get()
  async getSettings() {
    const raw = await this.settingsService.getSettings()
    return {
      openrouter: { baseUrl: raw.openrouter.baseUrl, hasKey: !!raw.openrouter.apiKey },
      openai: { baseUrl: raw.openai.baseUrl, hasKey: !!raw.openai.apiKey },
      deepseek: { baseUrl: raw.deepseek.baseUrl, hasKey: !!raw.deepseek.apiKey },
      opencode: { baseUrl: raw.opencode.baseUrl, hasKey: !!raw.opencode.apiKey },
    }
  }

  @Put()
  async updateSettings(@Body() body: Partial<CodeItSettings>) {
    try {
      await this.settingsService.updateSettings(body)
      return { success: true }
    } catch (err: any) {
      return { error: err.message, statusCode: 400 }
    }
  }
}
