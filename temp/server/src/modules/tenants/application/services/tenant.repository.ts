import type { TenantAggregate } from "../../domain/aggregates/tenant.aggregate";

export interface TenantUpsertParams {
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
}

export interface TenantRepository {
  list(): Promise<readonly TenantAggregate[]>;
  getById(tenantId: string): Promise<TenantAggregate | null>;
  create(params: TenantUpsertParams): Promise<TenantAggregate>;
  update(tenantId: string, params: TenantUpsertParams): Promise<TenantAggregate | null>;
  softDelete(tenantId: string): Promise<boolean>;
}

export const TENANT_REPOSITORY = Symbol("TENANT_REPOSITORY");
