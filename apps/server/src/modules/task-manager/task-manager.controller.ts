import { Body, Headers, Param } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { TaskManagerService } from './task-manager.service.js'
import type { TaskManagerStatus, TaskManagerTaskInput } from './task-manager.types.js'

@Controller('api/v1/task-manager')
export class TaskManagerController {
  constructor(@Inject(TaskManagerService) private readonly tasks: TaskManagerService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.tasks.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerTaskInput) {
    return this.tasks.upsert(headers, body)
  }

  @Post(':idOrUuid/status')
  status(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { status?: TaskManagerStatus }) {
    return this.tasks.status(headers, idOrUuid, body.status ?? 'todo')
  }

  @Post(':idOrUuid/delete')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.tasks.destroy(headers, idOrUuid)
  }
}
