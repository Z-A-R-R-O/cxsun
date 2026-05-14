import { Inject, Injectable } from "@nestjs/common";
import { TENANT_REPOSITORY, type TenantRepository } from "../services/tenant.repository";

@Injectable()
export class ListTenantsUseCase {
  public constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
  ) {}

  public execute() {
    return this.tenantRepository.list();
  }
}
