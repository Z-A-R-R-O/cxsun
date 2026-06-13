import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { normalizeMasterInput } from '../../../foundation/master-record/application/services/master-input-normalizer.js'
import { MasterRecordAggregate } from '../../../foundation/master-record/domain/aggregates/master-record.aggregate.js'
import { productMasterDefinition } from '../domain/value-objects/product-master.definition.js'
import { ProductMasterRepository } from '../infrastructure/persistence/product-master.repository.js'

@Injectable()
export class ProductMasterService {
  private readonly definition = productMasterDefinition

  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(ProductMasterRepository) private readonly records: ProductMasterRepository,
    @Inject(MasterRecordEventBus) private readonly eventBus: MasterRecordEventBus,
  ) {}

  definitionMetadata() {
    return this.definition
  }

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.records.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.find(context, idOrUuid)
    if (!record) throw new NotFoundException('Product master record was not found.')
    return record
  }

  async upsert(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const payload = normalizeMasterInput(this.definition, input)
    const record = input.id || input.uuid
      ? await this.records.update(context, String(input.uuid ?? input.id), payload)
      : await this.records.insert(context, payload)
    if (!record) throw new NotFoundException('Product master record was not found.')
    const aggregate = MasterRecordAggregate.fromRecord(this.definition, record)
    await this.eventBus.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.softDelete(context, idOrUuid)
    if (!record) return { ok: false, error: 'Product master record was not found.' }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.restore(context, idOrUuid)
    if (!record) return { ok: false, error: 'Product master record was not found.' }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).restoredEvent())
    return { ok: true }
  }
}
