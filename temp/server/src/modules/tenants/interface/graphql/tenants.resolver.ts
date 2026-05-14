import { Inject } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { GetTenantUseCase } from "../../application/use-cases/get-tenant.use-case";
import { ListTenantsUseCase } from "../../application/use-cases/list-tenants.use-case";
import { TenantModel } from "./tenant.model";

@Resolver(() => TenantModel)
export class TenantsResolver {
  public constructor(
    @Inject(ListTenantsUseCase)
    private readonly listTenantsUseCase: ListTenantsUseCase,
    @Inject(GetTenantUseCase)
    private readonly getTenantUseCase: GetTenantUseCase,
  ) {}

  @Query(() => [TenantModel], { name: "tenants" })
  public async listTenants(): Promise<TenantModel[]> {
    const tenants = await this.listTenantsUseCase.execute();
    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      deletedAt: tenant.deletedAt ? tenant.deletedAt.toISOString() : null,
    }));
  }

  @Query(() => TenantModel, { name: "tenant", nullable: true })
  public async getTenant(
    @Args("tenantId", { type: () => String }) tenantId: string,
  ): Promise<TenantModel | null> {
    const tenant = await this.getTenantUseCase.execute(tenantId);

    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      deletedAt: tenant.deletedAt ? tenant.deletedAt.toISOString() : null,
    };
  }
}
