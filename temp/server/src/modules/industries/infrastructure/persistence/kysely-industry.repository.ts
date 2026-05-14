import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  IndustryRepository,
  IndustryUpsertParams,
} from "../../application/services/industry.repository";
import type { IndustryRecord } from "../../domain/industry-record";

interface IndustryRow {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly is_active: boolean | number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly deleted_at: Date | string | null;
}

@Injectable()
export class KyselyIndustryRepository implements IndustryRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(): Promise<readonly IndustryRecord[]> {
    const rows = await this.connection.db
      .selectFrom("industries")
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => toIndustryRecord(row));
  }

  public async getById(industryId: string): Promise<IndustryRecord | null> {
    const numericIndustryId = Number(industryId);

    if (!Number.isInteger(numericIndustryId)) {
      return null;
    }

    const row = await this.connection.db
      .selectFrom("industries")
      .selectAll()
      .where("id", "=", numericIndustryId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row ? toIndustryRecord(row) : null;
  }

  public async create(params: IndustryUpsertParams): Promise<IndustryRecord> {
    const now = new Date();
    const result = await this.connection.db
      .insertInto("industries")
      .values({
        code: normalizeIndustryCode(params.code || params.name),
        name: params.name.trim(),
        is_active: params.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .executeTakeFirstOrThrow();
    const industry = await this.getById(String(result.insertId));

    if (!industry) {
      throw new Error("Industry was created but could not be read back.");
    }

    return industry;
  }

  public async update(
    industryId: string,
    params: IndustryUpsertParams,
  ): Promise<IndustryRecord | null> {
    const numericIndustryId = Number(industryId);

    if (!Number.isInteger(numericIndustryId)) {
      return null;
    }

    await this.connection.db
      .updateTable("industries")
      .set({
        code: normalizeIndustryCode(params.code || params.name),
        name: params.name.trim(),
        is_active: params.isActive,
        updated_at: new Date(),
      })
      .where("id", "=", numericIndustryId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return this.getById(industryId);
  }

  public async softDelete(industryId: string): Promise<boolean> {
    const numericIndustryId = Number(industryId);

    if (!Number.isInteger(numericIndustryId)) {
      return false;
    }

    const result = await this.connection.db
      .updateTable("industries")
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", numericIndustryId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }
}

function toIndustryRecord(row: IndustryRow): IndustryRecord {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    isActive: Boolean(row.is_active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
  };
}

function normalizeIndustryCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
