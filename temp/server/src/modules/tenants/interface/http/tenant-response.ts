import type { TenantAggregate } from "../../domain/aggregates/tenant.aggregate";

export interface TenantResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export function toTenantResponse(tenant: TenantAggregate): TenantResponse {
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
