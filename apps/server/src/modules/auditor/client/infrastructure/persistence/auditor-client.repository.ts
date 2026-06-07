import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { auditorClientDefinition } from '../../domain/value-objects/auditor-client.definition.js'

@Injectable()
export class AuditorClientRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, auditorClientDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, auditorClientDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, auditorClientDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, auditorClientDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, auditorClientDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, auditorClientDefinition, idOrUuid)
  }
}
