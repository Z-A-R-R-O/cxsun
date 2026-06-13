import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { TaskManagerRepository } from './task-manager.repository.js'
import type { TaskManagerAttachmentInput, TaskManagerCampaignInput, TaskManagerCampaignItemInput, TaskManagerCampaignItemTaskInput, TaskManagerCommentInput, TaskManagerContactCleanupCampaignInput, TaskManagerEventInput, TaskManagerLookupInput, TaskManagerReminderInput, TaskManagerSalesVerificationCampaignInput, TaskManagerScope, TaskManagerSettingsInput, TaskManagerStatus, TaskManagerSubtaskInput, TaskManagerTaskInput, TaskManagerTemplateInput } from './task-manager.types.js'

@Injectable()
export class TaskManagerService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TaskManagerRepository) private readonly tasks: TaskManagerRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async list(headers: TenantRequestHeaders, scope: TaskManagerScope = 'all') {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.list(context, scope)
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

  async forceDelete(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const result = await this.tasks.forceDelete(context, idOrUuid)
    await this.queue.enqueue({ type: 'task-manager.task-force-deleted', payload: { idOrUuid, tenantId: context.tenant.id } })
    return result
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, input: TaskManagerCommentInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.addComment(context, idOrUuid, input)
    await this.queue.enqueue({ type: 'task-manager.comment-added', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async updateComment(headers: TenantRequestHeaders, idOrUuid: string, commentIdOrUuid: string, input: TaskManagerCommentInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.updateComment(context, idOrUuid, commentIdOrUuid, input)
    await this.queue.enqueue({ type: 'task-manager.comment-updated', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async deleteComment(headers: TenantRequestHeaders, idOrUuid: string, commentIdOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.deleteComment(context, idOrUuid, commentIdOrUuid)
    await this.queue.enqueue({ type: 'task-manager.comment-deleted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async upsertSubtask(headers: TenantRequestHeaders, idOrUuid: string, input: TaskManagerSubtaskInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.upsertSubtask(context, idOrUuid, input)
    await this.queue.enqueue({ type: 'task-manager.subtask-upserted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async deleteSubtask(headers: TenantRequestHeaders, idOrUuid: string, subtaskIdOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.deleteSubtask(context, idOrUuid, subtaskIdOrUuid)
    await this.queue.enqueue({ type: 'task-manager.subtask-deleted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async addAttachment(headers: TenantRequestHeaders, idOrUuid: string, input: TaskManagerAttachmentInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.addAttachment(context, idOrUuid, input)
    await this.queue.enqueue({ type: 'task-manager.attachment-added', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async deleteAttachment(headers: TenantRequestHeaders, idOrUuid: string, attachmentIdOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.deleteAttachment(context, idOrUuid, attachmentIdOrUuid)
    await this.queue.enqueue({ type: 'task-manager.attachment-deleted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async upsertEvent(headers: TenantRequestHeaders, idOrUuid: string, input: TaskManagerEventInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.upsertEvent(context, idOrUuid, input)
    await this.queue.enqueue({ type: 'task-manager.event-upserted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async deleteEvent(headers: TenantRequestHeaders, idOrUuid: string, eventIdOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const task = await this.tasks.deleteEvent(context, idOrUuid, eventIdOrUuid)
    await this.queue.enqueue({ type: 'task-manager.event-deleted', payload: { taskUuid: task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, task }
  }

  async settings(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.settings(context)
  }

  async upsertSettings(headers: TenantRequestHeaders, input: TaskManagerSettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, settings: await this.tasks.upsertSettings(context, input) }
  }

  async listCategories(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.listCategories(context)
  }

  async upsertCategory(headers: TenantRequestHeaders, input: TaskManagerLookupInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const category = await this.tasks.upsertCategory(context, input)
    return { ok: true, category }
  }

  async listTags(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.listTags(context)
  }

  async upsertTag(headers: TenantRequestHeaders, input: TaskManagerLookupInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const tag = await this.tasks.upsertTag(context, input)
    return { ok: true, tag }
  }

  async listTemplates(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.listTemplates(context)
  }

  async upsertTemplate(headers: TenantRequestHeaders, input: TaskManagerTemplateInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, templates: await this.tasks.upsertTemplate(context, input) }
  }

  async listCampaigns(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.listCampaigns(context)
  }

  async upsertCampaign(headers: TenantRequestHeaders, input: TaskManagerCampaignInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, campaigns: await this.tasks.upsertCampaign(context, input) }
  }

  async upsertCampaignItem(headers: TenantRequestHeaders, campaignUuid: string, input: TaskManagerCampaignItemInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, campaigns: await this.tasks.upsertCampaignItem(context, campaignUuid, input) }
  }

  async createTaskFromCampaignItem(headers: TenantRequestHeaders, campaignUuid: string, itemUuid: string, input: TaskManagerCampaignItemTaskInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const result = await this.tasks.createTaskFromCampaignItem(context, campaignUuid, itemUuid, input)
    await this.queue.enqueue({ type: 'task-manager.campaign-item-task-created', payload: { campaignUuid, itemUuid, taskUuid: result.task?.uuid, tenantId: context.tenant.id } })
    return { ok: true, ...result }
  }

  async setCampaignStatus(headers: TenantRequestHeaders, campaignUuid: string, status: 'closed' | 'reset' | 'open' | 'archived') {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, campaigns: await this.tasks.setCampaignStatus(context, campaignUuid, status) }
  }

  async deleteCampaign(headers: TenantRequestHeaders, campaignUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const campaigns = await this.tasks.deleteCampaign(context, campaignUuid)
    await this.queue.enqueue({ type: 'task-manager.campaign-deleted', payload: { campaignUuid, tenantId: context.tenant.id } })
    return { ok: true, campaigns }
  }

  async listReminders(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tasks.listReminders(context)
  }

  async upsertReminder(headers: TenantRequestHeaders, input: TaskManagerReminderInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, reminders: await this.tasks.upsertReminder(context, input) }
  }

  async completeReminder(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, reminders: await this.tasks.completeReminder(context, idOrUuid) }
  }

  async createSalesVerificationCampaign(headers: TenantRequestHeaders, input: TaskManagerSalesVerificationCampaignInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const campaigns = await this.tasks.createSalesVerificationCampaign(context, input)
    await this.queue.enqueue({ type: 'task-manager.sales-verification-campaign-created', payload: { tenantId: context.tenant.id } })
    return { ok: true, campaigns }
  }

  async createContactCleanupCampaign(headers: TenantRequestHeaders, input: TaskManagerContactCleanupCampaignInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const campaigns = await this.tasks.createContactCleanupCampaign(context, input)
    await this.queue.enqueue({ type: 'task-manager.contact-cleanup-campaign-created', payload: { tenantId: context.tenant.id } })
    return { ok: true, campaigns }
  }
}
