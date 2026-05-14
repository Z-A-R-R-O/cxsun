import { Inject, Injectable } from "@nestjs/common";
import {
  TENANT_REPOSITORY,
  type TenantRepository,
  type TenantUpsertParams,
} from "../services/tenant.repository";

@Injectable()
export class UpdateTenantUseCase {
  public constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
  ) {}

  public execute(tenantId: string, params: TenantUpsertParams) {
    return this.tenantRepository.update(tenantId, params);
  }
}
