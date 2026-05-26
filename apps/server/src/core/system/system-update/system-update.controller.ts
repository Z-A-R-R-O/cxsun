import { Controller, Get, Post } from '../../decorators/controller.js'
import { Inject } from '../../decorators/inject.js'
import { UseGuards } from '../../decorators/guards.js'
import { AuthGuard } from '../../guards/auth.guard.js'
import { SystemUpdateService } from './system-update.service.js'

@Controller('api/system-update')
@UseGuards(AuthGuard)
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
    return this.systemUpdateService.startUpdate()
  }

  @Post('run-script')
  async runScript() {
    return this.systemUpdateService.startUpdateScript()
  }

  @Post('rollback')
  async rollback() {
    return this.systemUpdateService.startRollback()
  }
}
