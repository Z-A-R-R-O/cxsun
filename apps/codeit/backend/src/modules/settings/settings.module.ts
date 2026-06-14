import { Module } from '../../core/decorators/module.js'
import { SettingsController } from './settings.controller.js'
import { SettingsService } from './settings.service.js'
import { SettingsStore } from './settings.store.js'

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsStore],
})
export class SettingsModule {}
