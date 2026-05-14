import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import type {
  CompanySettingContext,
  CompanySettingInput,
  CompanySettingKey,
  CompanySettingRecord,
} from "../domain/company-setting-record";

type DynamicDatabase = Record<string, Record<string, unknown>>;

@Injectable()
export class CompanySettingsService implements OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async get(
    context: CompanySettingContext,
    key: CompanySettingKey,
  ): Promise<CompanySettingRecord> {
    const row = await this.db()
      .selectFrom("company_settings")
      .selectAll()
      .where("company_id", "=", Number(context.companyId))
      .where("setting_key", "=", key)
      .executeTakeFirst();

    if (!row) {
      return {
        companyId: context.companyId,
        key,
        values: {},
        updatedAt: new Date(0),
      };
    }

    return toRecord(row, context.companyId, key);
  }

  public async save(
    context: CompanySettingContext,
    key: CompanySettingKey,
    input: CompanySettingInput,
  ): Promise<CompanySettingRecord> {
    const values = cleanValues(input.values);
    const existing = await this.db()
      .selectFrom("company_settings")
      .select("id")
      .where("company_id", "=", Number(context.companyId))
      .where("setting_key", "=", key)
      .executeTakeFirst();

    if (existing) {
      await this.db()
        .updateTable("company_settings")
        .set({
          values_json: JSON.stringify(values),
          updated_at: new Date(),
        })
        .where("id", "=", Number(existing.id))
        .executeTakeFirst();
    } else {
      await this.db()
        .insertInto("company_settings")
        .values({
          company_id: Number(context.companyId),
          setting_key: key,
          values_json: JSON.stringify(values),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .executeTakeFirst();
    }

    return this.get(context, key);
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function toRecord(
  row: Record<string, unknown>,
  companyId: string,
  key: CompanySettingKey,
): CompanySettingRecord {
  return {
    companyId,
    key,
    values: parseValues(row.values_json),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at as string),
  };
}

function parseValues(value: unknown) {
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    return cleanValues(parsed);
  } catch {
    return {};
  }
}

function cleanValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
