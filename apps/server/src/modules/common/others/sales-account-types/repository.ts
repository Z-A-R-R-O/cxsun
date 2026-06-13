import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { salesAccountTypesCommonDefinition } from './definition.js'

@Injectable()
export class SalesAccountTypesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, salesAccountTypesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, salesAccountTypesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, salesAccountTypesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, salesAccountTypesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, salesAccountTypesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, salesAccountTypesCommonDefinition, idOrUuid)
  }
}
