import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import {
  createDatabaseConnection,
  loadDatabaseEnv,
  type DatabaseConnection,
} from "@cxnext/db";
import type {
  TenantRepository,
  TenantUpsertParams,
} from "../../application/services/tenant.repository";
import { TenantAggregate } from "../../domain/aggregates/tenant.aggregate";

interface TenantRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly is_active: boolean | number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly deleted_at: Date | string | null;
}

@Injectable()
export class KyselyTenantRepository implements TenantRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(): Promise<readonly TenantAggregate[]> {
    const rows = await this.connection.db
      .selectFrom("tenants")
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => toAggregate(row));
  }

  public async getById(tenantId: string): Promise<TenantAggregate | null> {
    const numericTenantId = Number(tenantId);

    if (!Number.isInteger(numericTenantId)) {
      return null;
    }

    const row = await this.connection.db
      .selectFrom("tenants")
      .selectAll()
      .where("id", "=", numericTenantId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row ? toAggregate(row) : null;
  }

  public async create(params: TenantUpsertParams): Promise<TenantAggregate> {
    const now = new Date();
    const result = await this.connection.db
      .insertInto("tenants")
      .values({
        name: params.name.trim(),
        slug: params.slug.trim(),
        is_active: params.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .executeTakeFirstOrThrow();
    const tenant = await this.getById(String(result.insertId));

    if (!tenant) {
      throw new Error("Tenant was created but could not be read back.");
    }

    return tenant;
  }

  public async update(
    tenantId: string,
    params: TenantUpsertParams,
  ): Promise<TenantAggregate | null> {
    const numericTenantId = Number(tenantId);

    if (!Number.isInteger(numericTenantId)) {
      return null;
    }

    await this.connection.db
      .updateTable("tenants")
      .set({
        name: params.name.trim(),
        slug: params.slug.trim(),
        is_active: params.isActive,
        updated_at: new Date(),
      })
      .where("id", "=", numericTenantId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return this.getById(tenantId);
  }

  public async softDelete(tenantId: string): Promise<boolean> {
    const numericTenantId = Number(tenantId);

    if (!Number.isInteger(numericTenantId)) {
      return false;
    }

    const result = await this.connection.db
      .updateTable("tenants")
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", numericTenantId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }
}

function toAggregate(row: TenantRow): TenantAggregate {
  return TenantAggregate.create({
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    isActive: Boolean(row.is_active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
  });
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
