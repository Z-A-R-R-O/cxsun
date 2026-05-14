import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
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

  @Post('run')
  async run() {
    return this.systemUpdateService.runUpdate()
  }
}
