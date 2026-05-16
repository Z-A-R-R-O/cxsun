import 'reflect-metadata'
import { Module } from '../../decorators/module.js'
import { SystemUpdateController } from './system-update.controller.js'
import { SystemUpdateService } from './system-update.service.js'

@Module({
  controllers: [SystemUpdateController],
  providers: [SystemUpdateService],
})
export class SystemUpdateModule {}
