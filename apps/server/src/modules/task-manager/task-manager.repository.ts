import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TaskManagerActivity, TaskManagerPriority, TaskManagerStatus, TaskManagerTask, TaskManagerTaskInput } from './task-manager.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class TaskManagerRepository {
  async list(context: TenantRuntimeContext) {
    const rows = await this.database(context)
      .selectFrom('task_manager_tasks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
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
    const patch = {
      title,
      subject: emptyAsNull(input.subject),
      description: emptyAsNull(input.description),
      module_key: emptyAsNull(input.module_key),
      linked_record_id: emptyAsNull(input.linked_record_id),
      linked_record_label: emptyAsNull(input.linked_record_label),
      assigned_to: emptyAsNull(input.assigned_to),
      assigned_to_name: emptyAsNull(input.assigned_to_name),
      assigned_by: context.user.email,
      priority: priorityValue(input.priority),
      status: nextStatus,
      due_date: emptyAsNull(input.due_date),
      started_at: nextStatus === 'in_progress' ? new Date() : null,
      completed_at: nextStatus === 'completed' ? new Date() : null,
      completed_by: nextStatus === 'completed' ? context.user.email : null,
      verification_required: Boolean(input.verification_required),
      auditor_followup_required: Boolean(input.auditor_followup_required),
      score: numberValue(input.score),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (input.uuid) {
      const existing = await this.find(context, input.uuid)
      if (!existing) throw new NotFoundException('Task was not found.')
      await this.database(context).updateTable('task_manager_tasks').set(patch).where('id', '=', existing.id).execute()
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

  private async taskFromRow(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<TaskManagerTask> {
    const activities = await this.database(context)
      .selectFrom('task_manager_activities')
      .selectAll()
      .where('task_id', '=', Number(row.id))
      .orderBy('id', 'desc')
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
      module_key: stringOrNull(row.module_key),
      linked_record_id: stringOrNull(row.linked_record_id),
      linked_record_label: stringOrNull(row.linked_record_label),
      assigned_to: stringOrNull(row.assigned_to),
      assigned_to_name: stringOrNull(row.assigned_to_name),
      assigned_by: String(row.assigned_by),
      priority: priorityValue(row.priority),
      status: statusValue(row.status),
      due_date: stringOrNull(row.due_date),
      started_at: row.started_at as Date | null,
      completed_at: row.completed_at as Date | null,
      completed_by: stringOrNull(row.completed_by),
      verification_required: Boolean(row.verification_required),
      auditor_followup_required: Boolean(row.auditor_followup_required),
      score: numberValue(row.score),
      created_by: String(row.created_by),
      updated_by: stringOrNull(row.updated_by),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: row.deleted_at as Date | null,
      activities: activities.map(toActivity),
    }
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0) || null
  }

  private async nextTaskNo(context: TenantRuntimeContext) {
    const rows = await this.database(context).selectFrom('task_manager_tasks').select('task_no').where('tenant_id', '=', context.tenant.id).orderBy('id', 'desc').limit(1).execute()
    const next = (Number(String(rows[0]?.task_no ?? '').match(/(\d+)$/)?.[1] ?? 0) || 0) + 1
    return `TASK-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`
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

function priorityValue(value: unknown): TaskManagerPriority {
  return value === 'low' || value === 'high' || value === 'urgent' ? value : 'normal'
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
