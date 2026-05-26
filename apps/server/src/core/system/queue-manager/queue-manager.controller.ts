import { Body, Param, Query } from '../../decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../decorators/controller.js'
import { Inject } from '../../decorators/inject.js'
import { UseGuards } from '../../decorators/guards.js'
import { AuthGuard } from '../../guards/auth.guard.js'
import { QueueManagerService } from './queue-manager.service.js'

@Controller('api/system/queue-manager')
@UseGuards(AuthGuard)
export class QueueManagerController {
  constructor(
    @Inject(QueueManagerService)
    private readonly queueManager: QueueManagerService,
  ) {}

  @Get('overview')
  overview() {
    return this.queueManager.overview()
  }

  @Get('jobs')
  list(@Query() query: { status?: string; queue?: string; limit?: string }) {
    return this.queueManager.list(query ?? {})
  }

  @Post('enqueue-backup')
  enqueueBackup() {
    return this.queueManager.enqueueBackup()
  }

  @Post('jobs/:id/action')
  action(@Param('id') id: string, @Body() body: { action?: 'retry' | 'cancel' | 'delete' }) {
    const action = body?.action
    if (action !== 'retry' && action !== 'cancel' && action !== 'delete') {
      return { ok: false, error: 'Invalid queue action.' }
    }

    return this.queueManager.action(id, action)
  }

  @Delete('jobs/:id')
  delete(@Param('id') id: string) {
    return this.queueManager.action(id, 'delete')
  }
}
