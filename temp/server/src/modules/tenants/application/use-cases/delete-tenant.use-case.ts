import { Inject, Injectable } from "@nestjs/common";
import { TENANT_REPOSITORY, type TenantRepository } from "../services/tenant.repository";

@Injectable()
export class DeleteTenantUseCase {
  public constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
  ) {}

  public execute(tenantId: string) {
    return this.tenantRepository.softDelete(tenantId);
  }
}
