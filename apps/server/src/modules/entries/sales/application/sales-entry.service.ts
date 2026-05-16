import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { SalesEntryAggregate } from '../domain/aggregates/sales-entry.aggregate.js'
import { salesEntryEvent } from '../domain/events/sales-entry.events.js'
import { SalesEntryRepository, type SalesEntryInput } from '../infrastructure/persistence/sales-entry.repository.js'
import { SalesEntryEventBus } from './sales-entry-event-bus.js'

@Injectable()
export class SalesEntryService {
  constructor(
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(SalesEntryRepository) private readonly salesEntries: SalesEntryRepository,
    @Inject(SalesEntryEventBus) private readonly events: SalesEntryEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.salesEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: SalesEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = input.id || input.uuid
      ? await this.salesEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.salesEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    const aggregate = SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, entry }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Sales entry was not found.' }
    await this.events.publish(SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Sales entry was not found.' }
    await this.events.publish(SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    await this.events.publish(salesEntryEvent('entries.sales.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { invoiceNo: entry.invoice_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.addActivity(context, idOrUuid, 'tool', `${String(body.tool ?? 'tool')} requested`)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    await this.events.publish(salesEntryEvent('entries.sales.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool: String(body.tool ?? 'tool'), invoiceNo: entry.invoice_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }
}
