import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { normalizeMasterInput } from '../../../foundation/master-record/application/services/master-input-normalizer.js'
import { MasterRecordAggregate } from '../../../foundation/master-record/domain/aggregates/master-record.aggregate.js'
import { salesAccountTypesCommonDefinition } from './definition.js'
import { migrateSalesAccountTypesCommonTable } from './migration.js'
import { SalesAccountTypesCommonRepository } from './repository.js'

@Injectable()
export class SalesAccountTypesCommonService {
  private readonly definition = salesAccountTypesCommonDefinition

  constructor(
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(SalesAccountTypesCommonRepository) private readonly records: SalesAccountTypesCommonRepository,
    @Inject(MasterRecordEventBus) private readonly eventBus: MasterRecordEventBus,
  ) {}

  definitionMetadata() {
    return this.definition
  }

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    await this.ensureDefaultRecords(context)
    return this.records.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.find(context, idOrUuid)
    if (!record) throw new NotFoundException(`SalesTypes common record was not found.`)
    return record
  }

  async upsert(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const payload = normalizeMasterInput(this.definition, input)
    const record = input.id || input.uuid
      ? await this.records.update(context, String(input.uuid ?? input.id), payload)
      : await this.records.insert(context, payload)
    if (!record) throw new NotFoundException(`SalesTypes common record was not found.`)
    const aggregate = MasterRecordAggregate.fromRecord(this.definition, record)
    await this.eventBus.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.softDelete(context, idOrUuid)
    if (!record) return { ok: false, error: `SalesTypes common record was not found.` }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.restore(context, idOrUuid)
    if (!record) return { ok: false, error: `SalesTypes common record was not found.` }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).restoredEvent())
    return { ok: true }
  }

  private async ensureDefaultRecords(context: TenantRuntimeContext) {
    await migrateSalesAccountTypesCommonTable(context.database)
    const records = await this.records.list(context)
    const hasDefault = records.some((record) => String(record.name ?? '').trim().toLowerCase() === 'sales account')
    if (!hasDefault) {
      await this.records.insert(context, {
        name: 'Sales Account',
        description: 'Default normal sales ledger.',
        is_active: true,
      })
    }
  }
}
