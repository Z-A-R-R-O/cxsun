import { Controller, Get, Post } from '../../decorators/controller.js'
import { Inject } from '../../decorators/inject.js'
import { SystemUpdateService } from './system-update.service.js'

@Controller('api/system-update')
export class SystemUpdateController {
  constructor(
    @Inject(SystemUpdateService)
    private readonly systemUpdateService: SystemUpdateService,
  ) {}

  @Get('status')
  async status() {
    return this.systemUpdateService.status()
  }

  @Get('preflight')
  async preflight() {
    return this.systemUpdateService.preflight()
  }

  @Post('run')
  async run() {
    return this.systemUpdateService.runUpdate()
  }
}
