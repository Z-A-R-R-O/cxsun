import 'reflect-metadata'
import { Module } from '../decorators/module.js'
import { HealthController } from './health.controller.js'
import { HealthService } from './health.service.js'

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
