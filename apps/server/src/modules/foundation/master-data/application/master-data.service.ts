import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordAggregate } from '../../master-record/domain/aggregates/master-record.aggregate.js'
import { getMasterDataDefinition, masterDataDefinitions, type MasterDataModuleDefinition } from '../domain/value-objects/master-data-definition.js'
import { MasterRecordRepository } from '../../master-record/infrastructure/persistence/master-record.repository.js'
import { MasterRecordEventBus } from '../../master-record/application/services/master-record-event-bus.js'

@Injectable()
export class MasterDataService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(MasterRecordRepository) private readonly records: MasterRecordRepository,
    @Inject(MasterRecordEventBus) private readonly eventBus: MasterRecordEventBus,
  ) {}

  modules(kind?: string) {
    return kind ? masterDataDefinitions.filter((definition) => definition.kind === kind) : masterDataDefinitions
  }

  events() {
    return this.eventBus.recent()
  }

  async list(headers: TenantRequestHeaders, moduleKey: string) {
    const definition = this.getDefinition(moduleKey)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.records.list(context, definition)
  }

  async get(headers: TenantRequestHeaders, moduleKey: string, idOrUuid: string) {
    const definition = this.getDefinition(moduleKey)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.find(context, definition, idOrUuid)

    if (!record) {
      throw new NotFoundException(`${definition.label} record was not found.`)
    }

    return record
  }

  async upsert(headers: TenantRequestHeaders, moduleKey: string, input: Record<string, unknown>) {
    const definition = this.getDefinition(moduleKey)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const payload = this.normalizeInput(definition, input)
    const record = input.id || input.uuid
      ? await this.records.update(context, definition, String(input.uuid ?? input.id), payload)
      : await this.records.insert(context, definition, payload)

    if (!record) {
      throw new NotFoundException(`${definition.label} record was not found.`)
    }

    const aggregate = MasterRecordAggregate.fromRecord(definition, record)
    await this.eventBus.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())

    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, moduleKey: string, idOrUuid: string) {
    const definition = this.getDefinition(moduleKey)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.softDelete(context, definition, idOrUuid)

    if (!record) {
      return { ok: false, error: `${definition.label} record was not found.` }
    }

    await this.eventBus.publish(MasterRecordAggregate.fromRecord(definition, record).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, moduleKey: string, idOrUuid: string) {
    const definition = this.getDefinition(moduleKey)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.restore(context, definition, idOrUuid)

    if (!record) {
      return { ok: false, error: `${definition.label} record was not found.` }
    }

    await this.eventBus.publish(MasterRecordAggregate.fromRecord(definition, record).restoredEvent())
    return { ok: true }
  }

  private getDefinition(moduleKey: string) {
    const definition = getMasterDataDefinition(moduleKey)

    if (!definition) {
      throw new NotFoundException(`Master data module "${moduleKey}" was not found.`)
    }

    return definition
  }

  private normalizeInput(
    definition: MasterDataModuleDefinition,
    input: Record<string, unknown>,
  ) {
    const payload: Record<string, unknown> = {}

    for (const column of definition.columns) {
      const value = input[column.key] ?? input[toCamelCase(column.key)]

      if (column.required && (value === null || value === undefined || value === '')) {
        throw new BadRequestException(`${column.label} is required.`)
      }

      if (column.type === 'boolean') {
        payload[column.key] = Boolean(value)
      } else if (column.type === 'number') {
        payload[column.key] = value === null || value === undefined || value === '' ? null : Number(value)
      } else {
        payload[column.key] = typeof value === 'string' ? value.trim() : value ?? null
      }
    }

    payload.is_active = input.is_active ?? input.isActive ?? true
    return payload
  }
}

function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}
