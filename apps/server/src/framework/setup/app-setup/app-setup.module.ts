import { Module } from '../../../core/decorators/module.js'
import { AppSetupController } from './app-setup.controller.js'
import { AppSetupService } from './app-setup.service.js'

@Module({
  controllers: [AppSetupController],
  providers: [AppSetupService],
})
export class AppSetupModule {}
