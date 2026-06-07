import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type {
  TaskManagerActivity,
  TaskManagerAttachmentInput,
  TaskManagerAttachment,
  TaskManagerCampaign,
  TaskManagerCampaignInput,
  TaskManagerCampaignItemInput,
  TaskManagerCampaignItemTaskInput,
  TaskManagerCategory,
  TaskManagerContactCleanupCampaignInput,
  TaskManagerCommentInput,
  TaskManagerComment,
  TaskManagerEvent,
  TaskManagerEventInput,
  TaskManagerLookupInput,
  TaskManagerPriority,
  TaskManagerReminderInput,
  TaskManagerSalesVerificationCampaignInput,
  TaskManagerScope,
  TaskManagerSettings,
  TaskManagerSettingsInput,
  TaskManagerStatus,
  TaskManagerSubtask,
  TaskManagerSubtaskInput,
  TaskManagerTag,
  TaskManagerTemplateInput,
  TaskManagerTask,
  TaskManagerTaskInput,
} from './task-manager.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class TaskManagerRepository {
  async list(context: TenantRuntimeContext, scope: TaskManagerScope = 'all') {
    let query = this.database(context)
      .selectFrom('task_manager_tasks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)

    const userEmail = context.user.email
    if (scope === 'assigned-to-me') {
      query = query.where('assigned_to', '=', userEmail).where('status', 'not in', ['completed', 'cancelled'])
    } else if (scope === 'open') {
      query = query.where((eb) => eb.or([eb('assigned_to', 'is', null), eb('assigned_to', '=', '')])).where('status', 'not in', ['completed', 'cancelled'])
    } else if (scope === 'my') {
      query = query.where((eb) => eb.or([
        eb('assigned_to', '=', userEmail),
        eb('created_by', '=', userEmail),
        eb('assigned_by', '=', userEmail),
      ]))
    }

    const rows = await query
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.taskFromRow(context, row)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string | number) {
    const row = await this.database(context)
      .selectFrom('task_manager_tasks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(idColumn(String(idOrUuid)), '=', idValue(String(idOrUuid)))
      .executeTakeFirst()
    return row ? this.taskFromRow(context, row) : null
  }

  async upsert(context: TenantRuntimeContext, input: TaskManagerTaskInput) {
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Task title is required.')
    const nextStatus = statusValue(input.status)
    const settings = await this.settings(context)
    const patch = {
      title,
      subject: emptyAsNull(input.subject),
      description: emptyAsNull(input.description),
      category_id: numberOrNull(input.category_id),
      task_type: emptyAsNull(input.task_type) ?? settings.default_task_type,
      module_key: emptyAsNull(input.module_key),
      linked_record_id: emptyAsNull(input.linked_record_id),
      linked_record_label: emptyAsNull(input.linked_record_label),
      source_module: emptyAsNull(input.source_module),
      source_record_type: emptyAsNull(input.source_record_type),
      source_record_id: emptyAsNull(input.source_record_id),
      source_record_uuid: emptyAsNull(input.source_record_uuid),
      source_record_label: emptyAsNull(input.source_record_label),
      source_snapshot: jsonOrNull(input.source_snapshot),
      assigned_to: emptyAsNull(input.assigned_to) ?? settings.default_assignee,
      assigned_to_name: emptyAsNull(input.assigned_to_name),
      assigned_by: context.user.email,
      reviewer: emptyAsNull(input.reviewer) ?? settings.default_reviewer,
      watchers: jsonOrNull(input.watchers),
      priority: priorityValue(input.priority ?? settings.default_priority),
      status: nextStatus,
      due_date: emptyAsNull(input.due_date),
      due_at: dateOrNull(input.due_at),
      reminder_at: dateOrNull(input.reminder_at) ?? reminderFromDueDate(input.due_date, settings.default_reminder_lead_days, settings.campaign_reminder_hour),
      recurrence_rule: emptyAsNull(input.recurrence_rule),
      period_key: emptyAsNull(input.period_key),
      started_at: nextStatus === 'in_progress' ? new Date() : null,
      first_assigned_at: emptyAsNull(input.assigned_to) ?? settings.default_assignee ? new Date() : null,
      completed_at: nextStatus === 'completed' ? new Date() : null,
      completed_by: nextStatus === 'completed' ? context.user.email : null,
      verification_required: Boolean(input.verification_required),
      auditor_followup_required: Boolean(input.auditor_followup_required),
      requires_confirmation: input.requires_confirmation ?? settings.require_completion_confirmation,
      confirmation_payload: jsonOrNull(input.confirmation_payload),
      result_payload: jsonOrNull(input.result_payload),
      score: numberValue(input.score),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (input.uuid) {
      const existing = await this.find(context, input.uuid)
      if (!existing) throw new NotFoundException('Task was not found.')
      await this.database(context)
        .updateTable('task_manager_tasks')
        .set({
          ...patch,
          first_assigned_at: existing.first_assigned_at ?? (emptyAsNull(input.assigned_to) ? new Date() : null),
        })
        .where('id', '=', existing.id)
        .execute()
      await this.syncTags(context, existing.id, input.tag_ids)
      await this.addActivity(context, existing.id, 'updated', `Task updated: ${title}`, input)
      return this.find(context, existing.id)
    }

    const result = await this.database(context)
      .insertInto('task_manager_tasks')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: await this.defaultCompanyId(context),
        task_no: await this.nextTaskNo(context),
        ...patch,
        created_by: context.user.email,
      })
      .executeTakeFirst()
    const taskId = Number(result.insertId)
    await this.syncTags(context, taskId, input.tag_ids)
    await this.addActivity(context, taskId, 'created', `Task created: ${title}`, input)
    return this.find(context, taskId)
  }

  async changeStatus(context: TenantRuntimeContext, idOrUuid: string, status: TaskManagerStatus) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const patch = {
      status,
      started_at: status === 'in_progress' && !task.started_at ? new Date() : task.started_at,
      completed_at: status === 'completed' ? new Date() : status === 'cancelled' ? task.completed_at : null,
      completed_by: status === 'completed' ? context.user.email : status === 'cancelled' ? task.completed_by : null,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    await this.database(context).updateTable('task_manager_tasks').set(patch).where('id', '=', task.id).execute()
    await this.addActivity(context, task.id, 'status', `Status changed to ${status}`, { status })
    return this.find(context, task.id)
  }

  async destroy(context: TenantRuntimeContext, idOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    await this.database(context)
      .updateTable('task_manager_tasks')
      .set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', task.id)
      .execute()
    await this.addActivity(context, task.id, 'deleted', 'Task suspended', {})
    return { ok: true }
  }

  async forceDelete(context: TenantRuntimeContext, idOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const database = this.database(context)
    const taskId = Number(task.id)

    // Detach external references first, then delete owned child rows, then the task.
    await database.updateTable('task_manager_campaign_items').set({ task_id: null, updated_at: new Date() }).where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_reminders').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_events').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_attachments').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_comments').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_subtasks').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_task_tags').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_activities').where('task_id', '=', taskId).execute()
    await database.deleteFrom('task_manager_tasks').where('id', '=', taskId).where('tenant_id', '=', context.tenant.id).execute()
    return { ok: true }
  }

  async addComment(context: TenantRuntimeContext, idOrUuid: string, input: TaskManagerCommentInput) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const body = input.body?.trim()
    if (!body) throw new BadRequestException('Comment body is required.')
    const parentCommentId = numberOrNull(input.parent_comment_id)
    await this.database(context)
      .insertInto('task_manager_comments')
      .values({
        uuid: dispatchPublicUuid(),
        task_id: task.id,
        parent_comment_id: parentCommentId,
        actor_email: context.user.email,
        body,
        visibility: 'authorized',
        updated_at: new Date(),
      })
      .execute()
    await this.database(context)
      .updateTable('task_manager_tasks')
      .set({ updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', task.id)
      .execute()
    await this.addActivity(context, task.id, 'comment', parentCommentId ? 'Reply added' : 'Comment added', { parent_comment_id: parentCommentId })
    return this.find(context, task.id)
  }

  async updateComment(context: TenantRuntimeContext, idOrUuid: string, commentIdOrUuid: string, input: TaskManagerCommentInput) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const body = input.body?.trim()
    if (!body) throw new BadRequestException('Comment body is required.')
    const existing = await this.database(context)
      .selectFrom('task_manager_comments')
      .select(['id', 'body'])
      .where('task_id', '=', task.id)
      .where(idColumn(String(commentIdOrUuid)), '=', idValue(String(commentIdOrUuid)))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!existing) throw new NotFoundException('Comment was not found.')
    await this.database(context).updateTable('task_manager_comments').set({ body, updated_at: new Date() }).where('id', '=', existing.id).execute()
    await this.database(context).updateTable('task_manager_tasks').set({ updated_at: new Date(), updated_by: context.user.email }).where('id', '=', task.id).execute()
    await this.addActivity(context, task.id, 'comment', 'Comment edited', { commentIdOrUuid })
    return this.find(context, task.id)
  }

  async deleteComment(context: TenantRuntimeContext, idOrUuid: string, commentIdOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const existing = await this.database(context)
      .selectFrom('task_manager_comments')
      .select(['id', 'body'])
      .where('task_id', '=', task.id)
      .where(idColumn(String(commentIdOrUuid)), '=', idValue(String(commentIdOrUuid)))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!existing) throw new NotFoundException('Comment was not found.')
    await this.database(context).deleteFrom('task_manager_comments').where('task_id', '=', task.id).where('parent_comment_id', '=', Number(existing.id)).execute()
    await this.database(context).deleteFrom('task_manager_comments').where('id', '=', existing.id).execute()
    await this.database(context).updateTable('task_manager_tasks').set({ updated_at: new Date(), updated_by: context.user.email }).where('id', '=', task.id).execute()
    await this.addActivity(context, task.id, 'comment', 'Comment deleted', { commentIdOrUuid })
    return this.find(context, task.id)
  }

  async upsertSubtask(context: TenantRuntimeContext, idOrUuid: string, input: TaskManagerSubtaskInput) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Sub-task title is required.')
    const nextStatus = statusValue(input.status ?? 'todo')
    const patch = {
      title,
      status: nextStatus,
      assigned_to: emptyAsNull(input.assigned_to),
      due_date: emptyAsNull(input.due_date),
      completed_by: nextStatus === 'completed' ? context.user.email : null,
      completed_at: nextStatus === 'completed' ? new Date() : null,
      sort_order: numberValue(input.sort_order),
      updated_at: new Date(),
    }

    if (input.uuid || input.id) {
      const existing = await this.database(context)
        .selectFrom('task_manager_subtasks')
        .select('id')
        .where('task_id', '=', task.id)
        .where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id)))
        .executeTakeFirst()
      if (!existing) throw new NotFoundException('Sub-task was not found.')
      await this.database(context).updateTable('task_manager_subtasks').set(patch).where('id', '=', existing.id).execute()
      await this.addActivity(context, task.id, 'subtask', `Sub-task updated: ${title}`, input)
    } else {
      await this.database(context)
        .insertInto('task_manager_subtasks')
        .values({
          uuid: dispatchPublicUuid(),
          task_id: task.id,
          ...patch,
        })
        .execute()
      await this.addActivity(context, task.id, 'subtask', `Sub-task added: ${title}`, input)
    }

    await this.database(context)
      .updateTable('task_manager_tasks')
      .set({ updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', task.id)
      .execute()
    return this.find(context, task.id)
  }

  async deleteSubtask(context: TenantRuntimeContext, idOrUuid: string, subtaskIdOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const existing = await this.database(context)
      .selectFrom('task_manager_subtasks')
      .select(['id', 'title'])
      .where('task_id', '=', task.id)
      .where(idColumn(String(subtaskIdOrUuid)), '=', idValue(String(subtaskIdOrUuid)))
      .executeTakeFirst()
    if (!existing) throw new NotFoundException('Sub-task was not found.')
    await this.database(context).deleteFrom('task_manager_subtasks').where('id', '=', existing.id).execute()
    await this.database(context)
      .updateTable('task_manager_tasks')
      .set({ updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', task.id)
      .execute()
    await this.addActivity(context, task.id, 'subtask', `Sub-task removed: ${String(existing.title)}`, { subtaskIdOrUuid })
    return this.find(context, task.id)
  }

  async addAttachment(context: TenantRuntimeContext, idOrUuid: string, input: TaskManagerAttachmentInput) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const storageKey = input.storage_key?.trim()
    const fileName = input.file_name?.trim()
    if (!storageKey || !fileName) throw new BadRequestException('Attachment storage key and file name are required.')
    await this.database(context)
      .insertInto('task_manager_attachments')
      .values({
        uuid: dispatchPublicUuid(),
        task_id: task.id,
        comment_id: numberOrNull(input.comment_id),
        storage_key: storageKey,
        file_name: fileName,
        mime_type: emptyAsNull(input.mime_type),
        file_size: numberValue(input.file_size),
        attachment_type: input.attachment_type?.trim() || 'file',
        uploaded_by: context.user.email,
      })
      .execute()
    await this.database(context)
      .updateTable('task_manager_tasks')
      .set({ updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', task.id)
      .execute()
    await this.addActivity(context, task.id, 'attachment', `Attachment added: ${fileName}`, { storage_key: storageKey })
    return this.find(context, task.id)
  }

  async deleteAttachment(context: TenantRuntimeContext, idOrUuid: string, attachmentIdOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const existing = await this.database(context)
      .selectFrom('task_manager_attachments')
      .select(['id', 'file_name'])
      .where('task_id', '=', task.id)
      .where(idColumn(String(attachmentIdOrUuid)), '=', idValue(String(attachmentIdOrUuid)))
      .executeTakeFirst()
    if (!existing) throw new NotFoundException('Attachment was not found.')
    await this.database(context).deleteFrom('task_manager_attachments').where('id', '=', existing.id).execute()
    await this.database(context).updateTable('task_manager_tasks').set({ updated_at: new Date(), updated_by: context.user.email }).where('id', '=', task.id).execute()
    await this.addActivity(context, task.id, 'attachment', `Attachment removed: ${String(existing.file_name)}`, { attachmentIdOrUuid })
    return this.find(context, task.id)
  }

  async upsertEvent(context: TenantRuntimeContext, idOrUuid: string, input: TaskManagerEventInput) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Event title is required.')
    const startsAt = dateOrNull(input.starts_at)
    if (!startsAt) throw new BadRequestException('Event start date is required.')
    const patch = {
      title,
      starts_at: startsAt,
      ends_at: dateOrNull(input.ends_at),
      is_all_day: Boolean(input.is_all_day),
      attendees: jsonOrNull(input.attendees),
      visibility: input.visibility?.trim() || 'private',
      location: emptyAsNull(input.location),
      description: emptyAsNull(input.description),
      status: input.status?.trim() || 'scheduled',
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context)
        .selectFrom('task_manager_events')
        .select('id')
        .where('task_id', '=', task.id)
        .where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id)))
        .where('deleted_at', 'is', null)
        .executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('task_manager_events').set(patch).where('id', '=', existing.id).execute()
      await this.addActivity(context, task.id, 'event-updated', `Event updated: ${title}`, input)
    } else {
      await this.database(context).insertInto('task_manager_events').values({ uuid: dispatchPublicUuid(), task_id: task.id, created_by: context.user.email, ...patch }).execute()
      await this.addActivity(context, task.id, 'event-scheduled', `Event scheduled: ${title}`, input)
    }
    await this.database(context).updateTable('task_manager_tasks').set({ updated_at: new Date(), updated_by: context.user.email }).where('id', '=', task.id).execute()
    return this.find(context, task.id)
  }

  async deleteEvent(context: TenantRuntimeContext, idOrUuid: string, eventIdOrUuid: string) {
    const task = await this.find(context, idOrUuid)
    if (!task) throw new NotFoundException('Task was not found.')
    const existing = await this.database(context)
      .selectFrom('task_manager_events')
      .select(['id', 'title', 'uuid'])
      .where('task_id', '=', task.id)
      .where(idColumn(String(eventIdOrUuid)), '=', idValue(String(eventIdOrUuid)))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!existing) throw new NotFoundException('Event was not found.')
    await this.database(context).updateTable('task_manager_events').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', existing.id).execute()
    await this.database(context).updateTable('task_manager_tasks').set({ updated_at: new Date(), updated_by: context.user.email }).where('id', '=', task.id).execute()
    await this.addActivity(context, task.id, 'event-deleted', `Event deleted: ${String(existing.title)}`, { event_uuid: existing.uuid })
    return this.find(context, task.id)
  }

  async addActivity(context: TenantRuntimeContext, taskId: number, activityType: string, message: string, payload: unknown) {
    await this.database(context)
      .insertInto('task_manager_activities')
      .values({
        uuid: dispatchPublicUuid(),
        task_id: taskId,
        activity_type: activityType,
        actor_email: context.user.email,
        message,
        payload: JSON.stringify(payload ?? {}),
      })
      .execute()
  }

  async settings(context: TenantRuntimeContext): Promise<TaskManagerSettings> {
    const row = await this.database(context).selectFrom('task_manager_settings').selectAll().where('tenant_id', '=', context.tenant.id).executeTakeFirst()
    if (row) return toSettings(row)
    await this.database(context).insertInto('task_manager_settings').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      default_priority: 'normal',
      default_task_type: 'simple_task',
      default_reminder_lead_days: 0,
      open_task_claiming: true,
      require_completion_confirmation: false,
      allow_authorized_comments: true,
      auto_create_campaign_reminders: true,
      campaign_reminder_hour: '09:00',
      media_visibility: 'private',
      media_folder: 'task/files',
      updated_by: context.user.email,
    }).execute()
    const created = await this.database(context).selectFrom('task_manager_settings').selectAll().where('tenant_id', '=', context.tenant.id).executeTakeFirstOrThrow()
    return toSettings(created)
  }

  async upsertSettings(context: TenantRuntimeContext, input: TaskManagerSettingsInput) {
    const current = await this.settings(context)
    const patch = {
      default_assignee: 'default_assignee' in input ? emptyAsNull(input.default_assignee) : current.default_assignee,
      default_reviewer: 'default_reviewer' in input ? emptyAsNull(input.default_reviewer) : current.default_reviewer,
      default_priority: input.default_priority?.trim() || current.default_priority || 'normal',
      default_task_type: input.default_task_type?.trim() || current.default_task_type || 'simple_task',
      default_reminder_lead_days: Math.max(0, Math.floor(numberValue(input.default_reminder_lead_days ?? current.default_reminder_lead_days))),
      open_task_claiming: input.open_task_claiming ?? current.open_task_claiming,
      require_completion_confirmation: input.require_completion_confirmation ?? current.require_completion_confirmation,
      allow_authorized_comments: input.allow_authorized_comments ?? current.allow_authorized_comments,
      auto_create_campaign_reminders: input.auto_create_campaign_reminders ?? current.auto_create_campaign_reminders,
      campaign_reminder_hour: timeValue(input.campaign_reminder_hour ?? current.campaign_reminder_hour),
      media_visibility: input.media_visibility === 'public' ? 'public' : 'private',
      media_folder: input.media_folder?.trim() || current.media_folder || 'task/files',
      settings: 'settings' in input ? jsonOrNull(input.settings) : current.settings,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    await this.database(context).updateTable('task_manager_settings').set(patch).where('id', '=', current.id).execute()
    return this.settings(context)
  }

  async listCategories(context: TenantRuntimeContext) {
    const rows = await this.database(context)
      .selectFrom('task_manager_categories')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('name', 'asc')
      .execute()
    return rows.map(toCategory)
  }

  async upsertCategory(context: TenantRuntimeContext, input: TaskManagerLookupInput) {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Category name is required.')
    const slug = slugValue(input.slug ?? name)
    const patch = {
      name,
      slug,
      color: emptyAsNull(input.color),
      description: emptyAsNull(input.description),
      is_active: input.is_active ?? true,
      updated_at: new Date(),
    }
    const existing = input.id
      ? await this.database(context).selectFrom('task_manager_categories').select('id').where('tenant_id', '=', context.tenant.id).where('id', '=', input.id).executeTakeFirst()
      : await this.database(context).selectFrom('task_manager_categories').select('id').where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).executeTakeFirst()

    if (existing) {
      await this.database(context).updateTable('task_manager_categories').set(patch).where('id', '=', existing.id).execute()
      const row = await this.database(context).selectFrom('task_manager_categories').selectAll().where('id', '=', existing.id).executeTakeFirstOrThrow()
      return toCategory(row)
    }

    await this.database(context).insertInto('task_manager_categories').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, ...patch }).execute()
    const row = await this.database(context).selectFrom('task_manager_categories').selectAll().where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).executeTakeFirstOrThrow()
    return toCategory(row)
  }

  async listTags(context: TenantRuntimeContext) {
    const rows = await this.database(context)
      .selectFrom('task_manager_tags')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('name', 'asc')
      .execute()
    return rows.map(toTag)
  }

  async upsertTag(context: TenantRuntimeContext, input: TaskManagerLookupInput) {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Tag name is required.')
    const slug = slugValue(input.slug ?? name)
    const patch = {
      name,
      slug,
      color: emptyAsNull(input.color),
      is_active: input.is_active ?? true,
      updated_at: new Date(),
    }
    const existing = input.id
      ? await this.database(context).selectFrom('task_manager_tags').select('id').where('tenant_id', '=', context.tenant.id).where('id', '=', input.id).executeTakeFirst()
      : await this.database(context).selectFrom('task_manager_tags').select('id').where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).executeTakeFirst()

    if (existing) {
      await this.database(context).updateTable('task_manager_tags').set(patch).where('id', '=', existing.id).execute()
      const row = await this.database(context).selectFrom('task_manager_tags').selectAll().where('id', '=', existing.id).executeTakeFirstOrThrow()
      return toTag(row)
    }

    await this.database(context).insertInto('task_manager_tags').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, ...patch }).execute()
    const row = await this.database(context).selectFrom('task_manager_tags').selectAll().where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).executeTakeFirstOrThrow()
    return toTag(row)
  }

  async listTemplates(context: TenantRuntimeContext) {
    const rows = await this.database(context).selectFrom('task_manager_templates').selectAll().where('tenant_id', '=', context.tenant.id).orderBy('id', 'desc').execute()
    return rows.map(toTemplate)
  }

  async upsertTemplate(context: TenantRuntimeContext, input: TaskManagerTemplateInput) {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Template name is required.')
    const patch = {
      name,
      template_type: input.template_type?.trim() || 'simple_task',
      category_id: numberOrNull(input.category_id),
      default_tags: jsonOrNull(input.default_tags),
      default_priority: input.default_priority?.trim() || 'normal',
      default_due_rule: emptyAsNull(input.default_due_rule),
      requires_confirmation: Boolean(input.requires_confirmation),
      settings: jsonOrNull(input.settings),
      is_active: input.is_active ?? true,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('task_manager_templates').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('task_manager_templates').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('task_manager_templates').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, ...patch }).execute()
    }
    return this.listTemplates(context)
  }

  async listCampaigns(context: TenantRuntimeContext) {
    const rows = await this.database(context).selectFrom('task_manager_campaigns').selectAll().where('tenant_id', '=', context.tenant.id).orderBy('generated_at', 'desc').orderBy('id', 'desc').execute()
    return Promise.all(rows.map((row) => this.toCampaign(context, row)))
  }

  async upsertCampaign(context: TenantRuntimeContext, input: TaskManagerCampaignInput) {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Campaign name is required.')
    const patch = {
      name,
      campaign_type: input.campaign_type?.trim() || 'record_checklist',
      source_module: emptyAsNull(input.source_module),
      status: input.status?.trim() || 'open',
      settings: jsonOrNull(input.settings),
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('task_manager_campaigns').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('task_manager_campaigns').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('task_manager_campaigns').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, generated_by: context.user.email, ...patch }).execute()
    }
    return this.listCampaigns(context)
  }

  async upsertCampaignItem(context: TenantRuntimeContext, campaignUuid: string, input: TaskManagerCampaignItemInput) {
    const campaign = await this.findCampaignRow(context, campaignUuid)
    if (!campaign) throw new NotFoundException('Campaign was not found.')
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('task_manager_campaign_items').selectAll().where('campaign_id', '=', Number(campaign.id)).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).executeTakeFirst()
      : null
    const nextStatus = input.status?.trim() || String(existing?.status ?? 'todo')
    const nextChecked = input.is_checked ?? Boolean(existing?.is_checked)
    const completed = nextStatus === 'completed' || nextChecked
    const patch = {
      source_module: 'source_module' in input ? emptyAsNull(input.source_module) : existing ? stringOrNull(existing.source_module) : null,
      source_record_type: 'source_record_type' in input ? emptyAsNull(input.source_record_type) : existing ? stringOrNull(existing.source_record_type) : null,
      source_record_id: 'source_record_id' in input ? emptyAsNull(input.source_record_id) : existing ? stringOrNull(existing.source_record_id) : null,
      source_record_uuid: 'source_record_uuid' in input ? emptyAsNull(input.source_record_uuid) : existing ? stringOrNull(existing.source_record_uuid) : null,
      source_record_label: 'source_record_label' in input ? emptyAsNull(input.source_record_label) : existing ? stringOrNull(existing.source_record_label) : null,
      assigned_to: 'assigned_to' in input ? emptyAsNull(input.assigned_to) : existing ? stringOrNull(existing.assigned_to) : null,
      status: nextStatus,
      is_checked: nextChecked,
      remarks: 'remarks' in input ? emptyAsNull(input.remarks) : existing ? stringOrNull(existing.remarks) : null,
      result_payload: 'result_payload' in input ? mergeJson(existing?.result_payload, input.result_payload) : existing ? stringOrNull(existing.result_payload) : null,
      completed_by: completed ? stringOrNull(existing?.completed_by) ?? context.user.email : null,
      completed_at: completed ? (existing?.completed_at as Date | null) ?? new Date() : null,
      updated_at: new Date(),
    }
    if (existing) {
      await this.database(context).updateTable('task_manager_campaign_items').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('task_manager_campaign_items').values({ uuid: dispatchPublicUuid(), campaign_id: Number(campaign.id), ...patch }).execute()
    }
    return this.listCampaigns(context)
  }

  async createTaskFromCampaignItem(context: TenantRuntimeContext, campaignUuid: string, itemUuid: string, input: TaskManagerCampaignItemTaskInput = {}) {
    const campaign = await this.findCampaignRow(context, campaignUuid)
    if (!campaign) throw new NotFoundException('Campaign was not found.')
    const item = await this.database(context)
      .selectFrom('task_manager_campaign_items')
      .selectAll()
      .where('campaign_id', '=', Number(campaign.id))
      .where(idColumn(itemUuid), '=', idValue(itemUuid))
      .executeTakeFirst()
    if (!item) throw new NotFoundException('Campaign item was not found.')
    const existingTaskId = numberOrNull(item.task_id)
    if (existingTaskId) {
      const existingTask = await this.find(context, existingTaskId)
      if (existingTask) return { campaigns: await this.listCampaigns(context), task: existingTask }
    }

    const payload = parseJsonObject(stringOrNull(item.result_payload) ?? '') ?? {}
    const sourceSnapshot = sourceSnapshotFromCampaignPayload(payload)
    const task = await this.upsert(context, {
      assigned_to: stringOrNull(item.assigned_to),
      description: campaignItemDescription(campaign, item),
      due_date: input.due_date ?? null,
      linked_record_id: stringOrNull(item.source_record_id),
      linked_record_label: stringOrNull(item.source_record_label),
      module_key: stringOrNull(item.source_module) ?? stringOrNull(campaign.source_module) ?? 'general',
      priority: input.priority,
      requires_confirmation: true,
      result_payload: payload,
      source_module: stringOrNull(item.source_module) ?? stringOrNull(campaign.source_module),
      source_record_id: stringOrNull(item.source_record_id),
      source_record_label: stringOrNull(item.source_record_label),
      source_record_type: stringOrNull(item.source_record_type),
      source_record_uuid: stringOrNull(item.source_record_uuid),
      source_snapshot: sourceSnapshot ?? payload,
      status: 'todo',
      task_type: String(campaign.campaign_type),
      title: input.title?.trim() || campaignItemTaskTitle(campaign, item),
    })
    if (!task) throw new BadRequestException('Unable to create task from campaign item.')

    await this.database(context)
      .updateTable('task_manager_campaign_items')
      .set({ task_id: task.id, assigned_to: task.assigned_to, updated_at: new Date() })
      .where('id', '=', Number(item.id))
      .execute()
    await this.addActivity(context, task.id, 'campaign-link', `Task linked to campaign: ${String(campaign.name)}`, { campaign_uuid: campaign.uuid, campaign_item_uuid: item.uuid })
    return { campaigns: await this.listCampaigns(context), task: await this.find(context, task.id) }
  }

  async setCampaignStatus(context: TenantRuntimeContext, campaignUuid: string, status: 'closed' | 'reset' | 'open' | 'archived') {
    const campaign = await this.findCampaignRow(context, campaignUuid)
    if (!campaign) throw new NotFoundException('Campaign was not found.')
    await this.database(context)
      .updateTable('task_manager_campaigns')
      .set({
        status: status === 'reset' ? 'open' : status,
        closed_at: status === 'closed' ? new Date() : null,
        reset_at: status === 'reset' ? new Date() : campaign.reset_at as Date | null,
        updated_at: new Date(),
      })
      .where('id', '=', Number(campaign.id))
      .execute()
    if (status === 'reset') {
      await this.database(context)
        .updateTable('task_manager_campaign_items')
        .set({ status: 'todo', is_checked: false, remarks: null, result_payload: null, completed_by: null, completed_at: null, updated_at: new Date() })
        .where('campaign_id', '=', Number(campaign.id))
        .execute()
    }
    return this.listCampaigns(context)
  }

  async deleteCampaign(context: TenantRuntimeContext, campaignUuid: string) {
    const campaign = await this.findCampaignRow(context, campaignUuid)
    if (!campaign) throw new NotFoundException('Campaign was not found.')
    await this.database(context).deleteFrom('task_manager_campaign_items').where('campaign_id', '=', Number(campaign.id)).execute()
    await this.database(context).deleteFrom('task_manager_reminders').where('payload', 'like', `%"campaign_id":${Number(campaign.id)}%`).execute()
    await this.database(context).deleteFrom('task_manager_campaigns').where('id', '=', Number(campaign.id)).execute()
    return this.listCampaigns(context)
  }

  async listReminders(context: TenantRuntimeContext) {
    const rows = await this.database(context).selectFrom('task_manager_reminders').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('remind_at', 'asc').orderBy('id', 'desc').execute()
    return rows.map(toReminder)
  }

  async upsertReminder(context: TenantRuntimeContext, input: TaskManagerReminderInput) {
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Reminder title is required.')
    const remindAt = dateOrNull(input.remind_at)
    if (!remindAt) throw new BadRequestException('Reminder date is required.')
    const patch = {
      task_id: numberOrNull(input.task_id),
      title,
      remind_at: remindAt,
      recurrence_rule: emptyAsNull(input.recurrence_rule),
      period_key: emptyAsNull(input.period_key),
      channel: input.channel?.trim() || 'dashboard',
      status: input.status?.trim() || 'pending',
      assigned_to: emptyAsNull(input.assigned_to),
      next_remind_at: remindAt,
      payload: jsonOrNull(input.payload),
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('task_manager_reminders').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('task_manager_reminders').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('task_manager_reminders').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email, ...patch }).execute()
    }
    return this.listReminders(context)
  }

  async completeReminder(context: TenantRuntimeContext, idOrUuid: string) {
    const existing = await this.database(context).selectFrom('task_manager_reminders').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).executeTakeFirst()
    if (!existing) throw new NotFoundException('Reminder was not found.')
    await this.database(context).updateTable('task_manager_reminders').set({ status: 'completed', completed_by: context.user.email, completed_at: new Date(), updated_at: new Date() }).where('id', '=', existing.id).execute()
    return this.listReminders(context)
  }

  async createSalesVerificationCampaign(context: TenantRuntimeContext, input: TaskManagerSalesVerificationCampaignInput) {
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    let query = this.database(context)
      .selectFrom('sales_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('invoice_date', 'desc')
      .orderBy('id', 'desc')

    if (input.from_date) query = query.where('invoice_date', '>=', input.from_date)
    if (input.to_date) query = query.where('invoice_date', '<=', input.to_date)

    const invoices = await query.execute()
    if (!invoices.length) throw new BadRequestException('No sales invoices were found for verification.')

    const campaignName = input.name?.trim() || `Sales Invoice GST/Tally Verification - ${new Date().toISOString().slice(0, 10)}`
    const campaignResult = await this.database(context)
      .insertInto('task_manager_campaigns')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        name: campaignName,
        campaign_type: 'sales_invoice_verification',
        source_module: 'sales',
        status: 'open',
        generated_by: context.user.email,
        settings: JSON.stringify({
          from_date: input.from_date ?? null,
          to_date: input.to_date ?? null,
          item_result_fields: ['gst_portal_verified', 'tally_verified', 'remarks'],
        }),
        updated_at: new Date(),
      })
      .executeTakeFirst()
    const campaignId = Number(campaignResult.insertId)

    await this.database(context)
      .insertInto('task_manager_campaign_items')
      .values(invoices.map((invoice) => ({
        uuid: dispatchPublicUuid(),
        campaign_id: campaignId,
        source_module: 'sales',
        source_record_type: 'sales_invoice',
        source_record_id: String(invoice.id),
        source_record_uuid: String(invoice.uuid),
        source_record_label: `${String(invoice.invoice_no)} - ${String(invoice.customer_name)} - ${numberValue(invoice.grand_total).toFixed(2)}`,
        assigned_to: emptyAsNull(input.assigned_to),
        status: 'todo',
        is_checked: false,
        remarks: null,
        result_payload: JSON.stringify({
          gst_portal_verified: false,
          tally_verified: false,
          remarks: '',
          invoice_snapshot: salesInvoiceSnapshot(invoice),
        }),
        completed_by: null,
        completed_at: null,
      })))
      .execute()

    if (input.reminder_at) {
      const remindAt = dateOrNull(input.reminder_at)
      if (remindAt) {
        await this.database(context)
          .insertInto('task_manager_reminders')
          .values({
            uuid: dispatchPublicUuid(),
            tenant_id: context.tenant.id,
            task_id: null,
            title: `Follow up: ${campaignName}`,
            remind_at: remindAt,
            recurrence_rule: null,
            period_key: new Date(remindAt).toISOString().slice(0, 7),
            channel: 'dashboard',
            status: 'pending',
            assigned_to: emptyAsNull(input.assigned_to),
            next_remind_at: remindAt,
            payload: JSON.stringify({ campaign_id: campaignId, campaign_type: 'sales_invoice_verification' }),
            created_by: context.user.email,
            updated_at: new Date(),
          })
          .execute()
      }
    }

    return this.listCampaigns(context)
  }

  async createContactCleanupCampaign(context: TenantRuntimeContext, input: TaskManagerContactCleanupCampaignInput) {
    const companyId = await this.defaultCompanyId(context)
    let query = this.database(context)
      .selectFrom('masters_contacts')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .orderBy('id', 'asc')

    if (input.include_only_missing) {
      query = query.where((eb) => eb.or([
        eb('primary_email', 'is', null),
        eb('primary_email', '=', ''),
        eb('primary_phone', 'is', null),
        eb('primary_phone', '=', ''),
      ]))
    }

    const contacts = await query.execute()
    if (!contacts.length) throw new BadRequestException('No contacts were found for cleanup.')

    const campaignName = input.name?.trim() || `Contact Phone/Email Confirmation - ${new Date().toISOString().slice(0, 10)}`
    const campaignResult = await this.database(context)
      .insertInto('task_manager_campaigns')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        name: campaignName,
        campaign_type: 'contact_data_cleanup',
        source_module: 'contacts',
        status: 'open',
        generated_by: context.user.email,
        settings: JSON.stringify({
          include_only_missing: Boolean(input.include_only_missing),
          item_result_fields: ['phone_confirmed', 'email_confirmed', 'corrected_phone', 'corrected_email', 'remarks'],
        }),
        updated_at: new Date(),
      })
      .executeTakeFirst()
    const campaignId = Number(campaignResult.insertId)

    await this.database(context)
      .insertInto('task_manager_campaign_items')
      .values(contacts.map((contact) => ({
        uuid: dispatchPublicUuid(),
        campaign_id: campaignId,
        source_module: 'contacts',
        source_record_type: 'contact',
        source_record_id: String(contact.id),
        source_record_uuid: String(contact.uuid),
        source_record_label: `${String(contact.code)} - ${String(contact.name)} - ${stringOrNull(contact.primary_phone) ?? 'No phone'} - ${stringOrNull(contact.primary_email) ?? 'No email'}`,
        assigned_to: emptyAsNull(input.assigned_to),
        status: 'todo',
        is_checked: false,
        remarks: null,
        result_payload: JSON.stringify({
          phone_confirmed: false,
          email_confirmed: false,
          corrected_phone: '',
          corrected_email: '',
          remarks: '',
          contact_snapshot: contactSnapshot(contact),
        }),
        completed_by: null,
        completed_at: null,
      })))
      .execute()

    if (input.reminder_at) {
      const remindAt = dateOrNull(input.reminder_at)
      if (remindAt) {
        await this.database(context)
          .insertInto('task_manager_reminders')
          .values({
            uuid: dispatchPublicUuid(),
            tenant_id: context.tenant.id,
            task_id: null,
            title: `Follow up: ${campaignName}`,
            remind_at: remindAt,
            recurrence_rule: null,
            period_key: new Date(remindAt).toISOString().slice(0, 7),
            channel: 'dashboard',
            status: 'pending',
            assigned_to: emptyAsNull(input.assigned_to),
            next_remind_at: remindAt,
            payload: JSON.stringify({ campaign_id: campaignId, campaign_type: 'contact_data_cleanup' }),
            created_by: context.user.email,
            updated_at: new Date(),
          })
          .execute()
      }
    }

    return this.listCampaigns(context)
  }

  private async syncTags(context: TenantRuntimeContext, taskId: number, tagIds: number[] | undefined) {
    if (!Array.isArray(tagIds)) return
    const uniqueTagIds = [...new Set(tagIds.map(Number).filter((tagId) => Number.isFinite(tagId) && tagId > 0))]
    await this.database(context).deleteFrom('task_manager_task_tags').where('task_id', '=', taskId).execute()
    if (!uniqueTagIds.length) return
    await this.database(context)
      .insertInto('task_manager_task_tags')
      .values(uniqueTagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })))
      .execute()
  }

  private async taskFromRow(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<TaskManagerTask> {
    const activities = await this.database(context)
      .selectFrom('task_manager_activities')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .orderBy('id', 'desc')
      .execute()
    const tags = await this.database(context)
      .selectFrom('task_manager_task_tags')
      .innerJoin('task_manager_tags', 'task_manager_tags.id', 'task_manager_task_tags.tag_id')
      .selectAll('task_manager_tags')
      .where('task_manager_task_tags.task_id', '=', Number(row.id))
      .orderBy('task_manager_tags.name', 'asc')
      .execute()
    const category = row.category_id
      ? await this.database(context).selectFrom('task_manager_categories').selectAll().where('id', '=', Number(row.category_id)).executeTakeFirst()
      : null
    const comments = await this.database(context)
      .selectFrom('task_manager_comments')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .where('deleted_at', 'is', null)
      .orderBy('id', 'asc')
      .execute()
    const subtasks = await this.database(context)
      .selectFrom('task_manager_subtasks')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .execute()
    const attachments = await this.database(context)
      .selectFrom('task_manager_attachments')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .orderBy('id', 'desc')
      .execute()
    const events = await this.database(context)
      .selectFrom('task_manager_events')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .where('deleted_at', 'is', null)
      .orderBy('starts_at', 'asc')
      .orderBy('id', 'asc')
      .execute()
    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: row.company_id === null || row.company_id === undefined ? null : Number(row.company_id),
      task_no: String(row.task_no),
      title: String(row.title),
      subject: stringOrNull(row.subject),
      description: stringOrNull(row.description),
      category_id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id),
      category_name: category ? String(category.name) : null,
      task_type: stringOrNull(row.task_type),
      module_key: stringOrNull(row.module_key),
      linked_record_id: stringOrNull(row.linked_record_id),
      linked_record_label: stringOrNull(row.linked_record_label),
      source_module: stringOrNull(row.source_module),
      source_record_type: stringOrNull(row.source_record_type),
      source_record_id: stringOrNull(row.source_record_id),
      source_record_uuid: stringOrNull(row.source_record_uuid),
      source_record_label: stringOrNull(row.source_record_label),
      source_snapshot: stringOrNull(row.source_snapshot),
      assigned_to: stringOrNull(row.assigned_to),
      assigned_to_name: stringOrNull(row.assigned_to_name),
      assigned_by: String(row.assigned_by),
      reviewer: stringOrNull(row.reviewer),
      claimed_by: stringOrNull(row.claimed_by),
      watchers: stringOrNull(row.watchers),
      priority: priorityValue(row.priority),
      status: statusValue(row.status),
      due_date: stringOrNull(row.due_date),
      due_at: row.due_at as Date | null,
      reminder_at: row.reminder_at as Date | null,
      recurrence_rule: stringOrNull(row.recurrence_rule),
      period_key: stringOrNull(row.period_key),
      started_at: row.started_at as Date | null,
      first_assigned_at: row.first_assigned_at as Date | null,
      completed_at: row.completed_at as Date | null,
      completed_by: stringOrNull(row.completed_by),
      reviewed_at: row.reviewed_at as Date | null,
      reopened_count: numberValue(row.reopened_count),
      overdue_at: row.overdue_at as Date | null,
      verification_required: Boolean(row.verification_required),
      auditor_followup_required: Boolean(row.auditor_followup_required),
      requires_confirmation: Boolean(row.requires_confirmation),
      confirmed_by: stringOrNull(row.confirmed_by),
      confirmed_at: row.confirmed_at as Date | null,
      confirmation_payload: stringOrNull(row.confirmation_payload),
      result_payload: stringOrNull(row.result_payload),
      score: numberValue(row.score),
      created_by: String(row.created_by),
      updated_by: stringOrNull(row.updated_by),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: row.deleted_at as Date | null,
      activities: activities.map(toActivity),
      tags: tags.map(toTag),
      comments: comments.map(toComment),
      subtasks: subtasks.map(toSubtask),
      attachments: attachments.map(toAttachment),
      events: events.map(toEvent),
    }
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0) || null
  }

  private async defaultAccountingYearId(context: TenantRuntimeContext) {
    const defaultCompany = await this.database(context).selectFrom('default_companies').select('accounting_year_id').where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    if (defaultCompany?.accounting_year_id) return Number(defaultCompany.accounting_year_id)
    const year = await this.database(context).selectFrom('accounting_years').select('id').where('is_active', '=', true).orderBy('start_date', 'desc').executeTakeFirst()
    return Number(year?.id ?? 0)
  }

  private async nextTaskNo(context: TenantRuntimeContext) {
    const rows = await this.database(context).selectFrom('task_manager_tasks').select('task_no').where('tenant_id', '=', context.tenant.id).orderBy('id', 'desc').limit(1).execute()
    const next = (Number(String(rows[0]?.task_no ?? '').match(/(\d+)$/)?.[1] ?? 0) || 0) + 1
    return `TASK-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`
  }

  private async toCampaign(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<TaskManagerCampaign> {
    const items = await this.database(context).selectFrom('task_manager_campaign_items').selectAll().where('campaign_id', '=', Number(row.id)).orderBy('id', 'asc').execute()
    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      name: String(row.name),
      campaign_type: String(row.campaign_type),
      source_module: stringOrNull(row.source_module),
      status: String(row.status),
      generated_by: String(row.generated_by),
      generated_at: row.generated_at as Date,
      closed_at: row.closed_at as Date | null,
      reset_at: row.reset_at as Date | null,
      settings: stringOrNull(row.settings),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      items: items.map(toCampaignItem),
    }
  }

  private findCampaignRow(context: TenantRuntimeContext, campaignUuid: string) {
    return this.database(context).selectFrom('task_manager_campaigns').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(campaignUuid), '=', idValue(campaignUuid)).executeTakeFirst()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toActivity(row: Record<string, unknown>): TaskManagerActivity {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    task_id: Number(row.task_id),
    activity_type: String(row.activity_type),
    actor_email: String(row.actor_email),
    message: String(row.message),
    payload: String(row.payload ?? '{}'),
    created_at: row.created_at as Date,
  }
}

function toCategory(row: Record<string, unknown>): TaskManagerCategory {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    slug: String(row.slug),
    color: stringOrNull(row.color),
    description: stringOrNull(row.description),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toTag(row: Record<string, unknown>): TaskManagerTag {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    slug: String(row.slug),
    color: stringOrNull(row.color),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toComment(row: Record<string, unknown>): TaskManagerComment {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    task_id: Number(row.task_id),
    parent_comment_id: row.parent_comment_id === null || row.parent_comment_id === undefined ? null : Number(row.parent_comment_id),
    actor_email: String(row.actor_email),
    body: String(row.body),
    visibility: String(row.visibility),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toSubtask(row: Record<string, unknown>): TaskManagerSubtask {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    task_id: Number(row.task_id),
    title: String(row.title),
    status: statusValue(row.status),
    assigned_to: stringOrNull(row.assigned_to),
    due_date: stringOrNull(row.due_date),
    completed_by: stringOrNull(row.completed_by),
    completed_at: row.completed_at as Date | null,
    sort_order: numberValue(row.sort_order),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toAttachment(row: Record<string, unknown>): TaskManagerAttachment {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    task_id: Number(row.task_id),
    comment_id: row.comment_id === null || row.comment_id === undefined ? null : Number(row.comment_id),
    storage_key: String(row.storage_key),
    file_name: String(row.file_name),
    mime_type: stringOrNull(row.mime_type),
    file_size: numberValue(row.file_size),
    attachment_type: String(row.attachment_type),
    uploaded_by: String(row.uploaded_by),
    created_at: row.created_at as Date,
  }
}

function toEvent(row: Record<string, unknown>): TaskManagerEvent {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    task_id: Number(row.task_id),
    title: String(row.title),
    starts_at: row.starts_at as Date,
    ends_at: row.ends_at as Date | null,
    is_all_day: Boolean(row.is_all_day),
    attendees: stringOrNull(row.attendees),
    visibility: String(row.visibility),
    location: stringOrNull(row.location),
    description: stringOrNull(row.description),
    status: String(row.status),
    created_by: String(row.created_by),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toTemplate(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    template_type: String(row.template_type),
    category_id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id),
    default_tags: stringOrNull(row.default_tags),
    default_priority: String(row.default_priority),
    default_due_rule: stringOrNull(row.default_due_rule),
    requires_confirmation: Boolean(row.requires_confirmation),
    settings: stringOrNull(row.settings),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toSettings(row: Record<string, unknown>): TaskManagerSettings {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    default_assignee: stringOrNull(row.default_assignee),
    default_reviewer: stringOrNull(row.default_reviewer),
    default_priority: String(row.default_priority),
    default_task_type: String(row.default_task_type),
    default_reminder_lead_days: numberValue(row.default_reminder_lead_days),
    open_task_claiming: Boolean(row.open_task_claiming),
    require_completion_confirmation: Boolean(row.require_completion_confirmation),
    allow_authorized_comments: Boolean(row.allow_authorized_comments),
    auto_create_campaign_reminders: Boolean(row.auto_create_campaign_reminders),
    campaign_reminder_hour: String(row.campaign_reminder_hour),
    media_visibility: String(row.media_visibility),
    media_folder: String(row.media_folder),
    settings: stringOrNull(row.settings),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toCampaignItem(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    campaign_id: Number(row.campaign_id),
    task_id: row.task_id === null || row.task_id === undefined ? null : Number(row.task_id),
    source_module: stringOrNull(row.source_module),
    source_record_type: stringOrNull(row.source_record_type),
    source_record_id: stringOrNull(row.source_record_id),
    source_record_uuid: stringOrNull(row.source_record_uuid),
    source_record_label: stringOrNull(row.source_record_label),
    assigned_to: stringOrNull(row.assigned_to),
    status: String(row.status),
    is_checked: Boolean(row.is_checked),
    remarks: stringOrNull(row.remarks),
    result_payload: stringOrNull(row.result_payload),
    completed_by: stringOrNull(row.completed_by),
    completed_at: row.completed_at as Date | null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function campaignItemTaskTitle(campaign: Record<string, unknown>, item: Record<string, unknown>) {
  const label = stringOrNull(item.source_record_label) ?? 'Campaign item'
  return `${String(campaign.name)}: ${label}`.slice(0, 240)
}

function campaignItemDescription(campaign: Record<string, unknown>, item: Record<string, unknown>) {
  return [
    `Campaign: ${String(campaign.name)}`,
    `Campaign type: ${String(campaign.campaign_type)}`,
    `Source: ${[stringOrNull(item.source_module), stringOrNull(item.source_record_type)].filter(Boolean).join(' / ') || 'General'}`,
    `Record: ${stringOrNull(item.source_record_label) ?? 'Not set'}`,
    stringOrNull(item.remarks) ? `Remarks: ${stringOrNull(item.remarks)}` : '',
  ].filter(Boolean).join('\n')
}

function sourceSnapshotFromCampaignPayload(payload: Record<string, unknown>) {
  for (const key of ['invoice_snapshot', 'contact_snapshot', 'source_snapshot']) {
    const value = payload[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  }
  return null
}

function toReminder(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    task_id: row.task_id === null || row.task_id === undefined ? null : Number(row.task_id),
    title: String(row.title),
    remind_at: row.remind_at as Date,
    recurrence_rule: stringOrNull(row.recurrence_rule),
    period_key: stringOrNull(row.period_key),
    channel: String(row.channel),
    status: String(row.status),
    assigned_to: stringOrNull(row.assigned_to),
    last_sent_at: row.last_sent_at as Date | null,
    next_remind_at: row.next_remind_at as Date | null,
    acknowledged_by: stringOrNull(row.acknowledged_by),
    acknowledged_at: row.acknowledged_at as Date | null,
    completed_by: stringOrNull(row.completed_by),
    completed_at: row.completed_at as Date | null,
    payload: stringOrNull(row.payload),
    created_by: String(row.created_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function salesInvoiceSnapshot(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    invoice_no: String(row.invoice_no),
    invoice_date: String(row.invoice_date),
    customer_name: String(row.customer_name),
    customer_gstin: stringOrNull(row.customer_gstin),
    taxable_total: numberValue(row.taxable_total),
    tax_total: numberValue(row.tax_total),
    grand_total: numberValue(row.grand_total),
    irn: stringOrNull(row.irn),
    ack_no: stringOrNull(row.ack_no),
    eway_bill_no: stringOrNull(row.eway_bill_no),
  }
}

function contactSnapshot(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    code: String(row.code),
    name: String(row.name),
    legal_name: stringOrNull(row.legal_name),
    gstin: stringOrNull(row.gstin),
    primary_email: stringOrNull(row.primary_email),
    primary_phone: stringOrNull(row.primary_phone),
  }
}

function priorityValue(value: unknown): TaskManagerPriority {
  const tag = typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : ''
  return tag || 'normal'
}

function statusValue(value: unknown): TaskManagerStatus {
  return value === 'todo' || value === 'in_progress' || value === 'review' || value === 'completed' || value === 'cancelled' ? value : 'new'
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) && number > 0 ? number : null
}

function dateOrNull(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date : null
}

function reminderFromDueDate(dueDate: unknown, leadDays: number, hour: string) {
  if (!dueDate || leadDays <= 0) return null
  const date = new Date(String(dueDate))
  if (!Number.isFinite(date.getTime())) return null
  const [hours, minutes] = timeValue(hour).split(':').map(Number)
  date.setDate(date.getDate() - leadDays)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function timeValue(value: unknown) {
  const text = String(value ?? '').trim()
  return /^\d{2}:\d{2}$/.test(text) ? text : '09:00'
}

function jsonOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function mergeJson(existing: unknown, next: unknown) {
  if (next === null || next === undefined || next === '') return null
  if (typeof next === 'string') return next
  const existingValue = typeof existing === 'string' ? parseJsonObject(existing) : null
  return JSON.stringify({ ...(existingValue ?? {}), ...(next as Record<string, unknown>) })
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function slugValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || dispatchPublicUuid().toLowerCase()
}
