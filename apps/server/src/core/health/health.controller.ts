import 'reflect-metadata'
import { Controller, Get } from '../decorators/controller.js'
import { Inject } from '../decorators/inject.js'
import { HealthService } from './health.service.js'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  async check() {
    return this.healthService.check()
  }
}
