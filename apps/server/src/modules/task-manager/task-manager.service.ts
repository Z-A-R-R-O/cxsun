import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { TaskManagerRepository } from './task-manager.repository.js'
import type { TaskManagerStatus, TaskManagerTaskInput } from './task-manager.types.js'

@Injectable()
export class TaskManagerService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TaskManagerRepository) private readonly tasks: TaskManagerRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.find(context, idOrUuid)
  }

  async upsert(headers: TenantRequestHeaders, input: TaskManagerTaskInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.upsert(context, input)
    await this.queue.enqueue({ type: 'task-manager.task-upserted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async status(headers: TenantRequestHeaders, idOrUuid: string, status: TaskManagerStatus) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.changeStatus(context, idOrUuid, status)
    await this.queue.enqueue({ type: 'task-manager.status-changed', payload: { status, taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.destroy(context, idOrUuid)
  }
}
