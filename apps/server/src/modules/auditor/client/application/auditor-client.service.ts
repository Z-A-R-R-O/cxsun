import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { normalizeMasterInput } from '../../../foundation/master-record/application/services/master-input-normalizer.js'
import { AuditorClientRepository } from '../infrastructure/persistence/auditor-client.repository.js'
import { auditorClientDefinition } from '../domain/value-objects/auditor-client.definition.js'

@Injectable()
export class AuditorClientService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(AuditorClientRepository) private readonly records: AuditorClientRepository,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.records.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.find(context, idOrUuid)
    if (!record) throw new NotFoundException('Auditor client was not found.')
    return record
  }

  async upsert(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const payload = normalizeMasterInput(auditorClientDefinition, {
      ...input,
      group_name: input.group_name ?? input.groupName ?? input.group,
    })
    const record = input.id || input.uuid
      ? await this.records.update(context, String(input.uuid ?? input.id), payload)
      : await this.records.insert(context, payload)
    if (!record) throw new NotFoundException('Auditor client was not found.')
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return { ok: Boolean(await this.records.softDelete(context, idOrUuid)) }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return { ok: Boolean(await this.records.restore(context, idOrUuid)) }
  }
}
