import { Injectable } from "@nestjs/common";
import type {
  TenantRepository,
  TenantUpsertParams,
} from "../../application/services/tenant.repository";
import { TenantAggregate } from "../../domain/aggregates/tenant.aggregate";
import type { TenantRecord } from "./tenant-record";

const seedTenants: readonly TenantRecord[] = [
  {
    id: "1",
    name: "Codexsun Commerce",
    slug: "codexsun-commerce",
    isActive: true,
    createdAt: new Date("2026-04-28T09:00:00.000Z"),
    updatedAt: new Date("2026-04-28T09:00:00.000Z"),
    deletedAt: null,
  },
  {
    id: "2",
    name: "Acme Enterprise",
    slug: "acme-enterprise",
    isActive: true,
    createdAt: new Date("2026-04-28T10:30:00.000Z"),
    updatedAt: new Date("2026-04-28T10:30:00.000Z"),
    deletedAt: null,
  },
  {
    id: "3",
    name: "Northwind Trial",
    slug: "northwind-trial",
    isActive: false,
    createdAt: new Date("2026-04-28T11:45:00.000Z"),
    updatedAt: new Date("2026-04-29T06:15:00.000Z"),
    deletedAt: null,
  },
] as const;

@Injectable()
export class InMemoryTenantRepository implements TenantRepository {
  public async list(): Promise<readonly TenantAggregate[]> {
    return seedTenants.filter((tenant) => !tenant.deletedAt).map((tenant) => toAggregate(tenant));
  }

  public async getById(tenantId: string): Promise<TenantAggregate | null> {
    const tenant = seedTenants.find((item) => item.id === tenantId && !item.deletedAt);
    return tenant ? toAggregate(tenant) : null;
  }

  public async create(params: TenantUpsertParams): Promise<TenantAggregate> {
    return TenantAggregate.create({
      id: String(seedTenants.length + 1),
      name: params.name,
      slug: params.slug,
      isActive: params.isActive,
    });
  }

  public async update(tenantId: string, params: TenantUpsertParams): Promise<TenantAggregate | null> {
    const tenant = seedTenants.find((item) => item.id === tenantId && !item.deletedAt);

    if (!tenant) {
      return null;
    }

    return TenantAggregate.create({
      id: tenant.id,
      name: params.name,
      slug: params.slug,
      isActive: params.isActive,
      createdAt: tenant.createdAt,
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public async softDelete(tenantId: string): Promise<boolean> {
    return seedTenants.some((tenant) => tenant.id === tenantId && !tenant.deletedAt);
  }
}

function toAggregate(record: TenantRecord): TenantAggregate {
  return TenantAggregate.create({
    id: record.id,
    name: record.name,
    slug: record.slug,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  });
}
