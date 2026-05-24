import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { DeliveryNoteAggregate } from '../domain/aggregates/delivery-note.aggregate.js'
import { DeliveryNoteEvent } from '../domain/events/delivery-note.events.js'
import { DeliveryNoteRepository, type DeliveryNoteInput } from '../infrastructure/persistence/delivery-note.repository.js'
import { DeliveryNoteEventBus } from './delivery-note-event-bus.js'

@Injectable()
export class DeliveryNoteService {
  constructor(
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(DeliveryNoteRepository) private readonly deliveryNotes: DeliveryNoteRepository,
    @Inject(DeliveryNoteEventBus) private readonly events: DeliveryNoteEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.deliveryNotes.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.deliveryNotes.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Delivery note was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: DeliveryNoteInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = input.id || input.uuid
      ? await this.deliveryNotes.update(context, String(input.uuid ?? input.id), input)
      : await this.deliveryNotes.insert(context, input)
    if (!entry) throw new NotFoundException('Delivery note was not found.')
    const aggregate = DeliveryNoteAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, entry }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.deliveryNotes.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Delivery note was not found.' }
    await this.events.publish(DeliveryNoteAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.deliveryNotes.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Delivery note was not found.' }
    await this.events.publish(DeliveryNoteAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.deliveryNotes.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Delivery note was not found.')
    await this.events.publish(DeliveryNoteEvent('stock.outward.deliveryNote.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.deliveryNotes.addActivity(context, idOrUuid, 'tool', `${String(body.tool ?? 'tool')} requested`)
    if (!entry) throw new NotFoundException('Delivery note was not found.')
    await this.events.publish(DeliveryNoteEvent('stock.outward.deliveryNote.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool: String(body.tool ?? 'tool'), entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }
}

