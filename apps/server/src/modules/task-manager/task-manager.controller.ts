import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { TaskManagerService } from './task-manager.service.js'
import type { TaskManagerAttachmentInput, TaskManagerCampaignInput, TaskManagerCampaignItemInput, TaskManagerCampaignItemTaskInput, TaskManagerCommentInput, TaskManagerContactCleanupCampaignInput, TaskManagerLookupInput, TaskManagerReminderInput, TaskManagerSalesVerificationCampaignInput, TaskManagerScope, TaskManagerSettingsInput, TaskManagerStatus, TaskManagerSubtaskInput, TaskManagerTaskInput, TaskManagerTemplateInput } from './task-manager.types.js'

@Controller('api/v1/task-manager')
export class TaskManagerController {
  constructor(@Inject(TaskManagerService) private readonly tasks: TaskManagerService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders, @Query('scope') scope?: TaskManagerScope) {
    return this.tasks.list(headers, scopeValue(scope))
  }

  @Get('settings')
  settings(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.settings(headers)
  }

  @Post('settings/upsert')
  upsertSettings(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerSettingsInput) {
    return this.tasks.upsertSettings(headers, body)
  }

  @Get('categories')
  categories(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.listCategories(headers)
  }

  @Post('categories/upsert')
  upsertCategory(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerLookupInput) {
    return this.tasks.upsertCategory(headers, body)
  }

  @Get('tags')
  tags(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.listTags(headers)
  }

  @Post('tags/upsert')
  upsertTag(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerLookupInput) {
    return this.tasks.upsertTag(headers, body)
  }

  @Get('templates')
  templates(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.listTemplates(headers)
  }

  @Post('templates/upsert')
  upsertTemplate(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerTemplateInput) {
    return this.tasks.upsertTemplate(headers, body)
  }

  @Get('campaigns')
  campaigns(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.listCampaigns(headers)
  }

  @Post('campaigns/upsert')
  upsertCampaign(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerCampaignInput) {
    return this.tasks.upsertCampaign(headers, body)
  }

  @Post('campaigns/sales-verification')
  salesVerificationCampaign(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerSalesVerificationCampaignInput) {
    return this.tasks.createSalesVerificationCampaign(headers, body)
  }

  @Post('campaigns/contact-cleanup')
  contactCleanupCampaign(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerContactCleanupCampaignInput) {
    return this.tasks.createContactCleanupCampaign(headers, body)
  }

  @Post('campaigns/:campaignUuid/items/upsert')
  upsertCampaignItem(@Headers() headers: TenantRequestHeaders, @Param('campaignUuid') campaignUuid: string, @Body() body: TaskManagerCampaignItemInput) {
    return this.tasks.upsertCampaignItem(headers, campaignUuid, body)
  }

  @Post('campaigns/:campaignUuid/items/:itemUuid/create-task')
  createTaskFromCampaignItem(
    @Headers() headers: TenantRequestHeaders,
    @Param('campaignUuid') campaignUuid: string,
    @Param('itemUuid') itemUuid: string,
    @Body() body: TaskManagerCampaignItemTaskInput,
  ) {
    return this.tasks.createTaskFromCampaignItem(headers, campaignUuid, itemUuid, body ?? {})
  }

  @Post('campaigns/:campaignUuid/status')
  campaignStatus(@Headers() headers: TenantRequestHeaders, @Param('campaignUuid') campaignUuid: string, @Body() body: { status?: 'closed' | 'reset' | 'open' | 'archived' }) {
    return this.tasks.setCampaignStatus(headers, campaignUuid, body.status ?? 'open')
  }

  @Post('campaigns/:campaignUuid/delete')
  deleteCampaign(@Headers() headers: TenantRequestHeaders, @Param('campaignUuid') campaignUuid: string) {
    return this.tasks.deleteCampaign(headers, campaignUuid)
  }

  @Get('reminders')
  reminders(@Headers() headers: TenantRequestHeaders) {
    return this.tasks.listReminders(headers)
  }

  @Post('reminders/upsert')
  upsertReminder(@Headers() headers: TenantRequestHeaders, @Body() body: TaskManagerReminderInput) {
    return this.tasks.upsertReminder(headers, body)
  }

  @Post('reminders/:idOrUuid/complete')
  completeReminder(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.tasks.completeReminder(headers, idOrUuid)
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

  @Post(':idOrUuid/comments')
  comment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: TaskManagerCommentInput) {
    return this.tasks.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/subtasks/upsert')
  upsertSubtask(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: TaskManagerSubtaskInput) {
    return this.tasks.upsertSubtask(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/subtasks/:subtaskIdOrUuid/delete')
  deleteSubtask(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Param('subtaskIdOrUuid') subtaskIdOrUuid: string,
  ) {
    return this.tasks.deleteSubtask(headers, idOrUuid, subtaskIdOrUuid)
  }

  @Post(':idOrUuid/attachments')
  attachment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: TaskManagerAttachmentInput) {
    return this.tasks.addAttachment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/force-delete')
  forceDelete(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.tasks.forceDelete(headers, idOrUuid)
  }

  @Post(':idOrUuid/delete')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.tasks.destroy(headers, idOrUuid)
  }
}

function scopeValue(value: unknown): TaskManagerScope {
  return value === 'my' || value === 'assigned-to-me' || value === 'open' || value === 'all' ? value : 'all'
}
