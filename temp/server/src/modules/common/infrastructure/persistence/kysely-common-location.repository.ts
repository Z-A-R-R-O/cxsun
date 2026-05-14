import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { CommonLocationRepository } from "../../application/services/common-location.repository";
import type {
  CommonLocationRecord,
  CommonLocationUpsertParams,
} from "../../domain/entities/common-location-record";
import type {
  CommonLocationDefinition,
  CommonLocationModuleKey,
} from "../../domain/value-objects/common-location-definition";
import { getCommonLocationDefinition } from "../../domain/value-objects/common-location-definition";

type CommonRow = Record<string, unknown> & {
  readonly id: number;
  readonly code: string;
  readonly name?: string | null;
  readonly is_active: boolean | number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly deleted_at: Date | string | null;
};

interface DynamicQueryBuilder {
  selectAll(): DynamicQueryBuilder;
  where(column: string, operator: string, value: unknown): DynamicQueryBuilder;
  orderBy(column: string, direction: "asc" | "desc"): DynamicQueryBuilder;
  values(payload: Record<string, unknown>): DynamicQueryBuilder;
  set(payload: Record<string, unknown>): DynamicQueryBuilder;
  execute(): Promise<Record<string, unknown>[]>;
  executeTakeFirst(): Promise<Record<string, unknown>>;
}

interface DynamicQueryDatabase {
  selectFrom(tableName: string): DynamicQueryBuilder;
  insertInto(tableName: string): DynamicQueryBuilder;
  updateTable(tableName: string): DynamicQueryBuilder;
}

@Injectable()
export class KyselyCommonLocationRepository implements CommonLocationRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(moduleKey: CommonLocationModuleKey): Promise<readonly CommonLocationRecord[]> {
    const definition = getCommonLocationDefinition(moduleKey);
    const [sortColumn, sortDirection] = definition.listOrder;
    const rows = await this.queryDatabase()
      .selectFrom(definition.tableName)
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy(sortColumn, sortDirection as "asc" | "desc")
      .execute();

    return (rows as CommonRow[]).map((row: CommonRow) => toCommonLocationRecord(row));
  }

  public async getById(
    moduleKey: CommonLocationModuleKey,
    id: string,
  ): Promise<CommonLocationRecord | null> {
    const recordId = Number(id);
    const definition = getCommonLocationDefinition(moduleKey);
    const row = await this.queryDatabase()
      .selectFrom(definition.tableName)
      .selectAll()
      .where("id", "=", recordId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row ? toCommonLocationRecord(row as CommonRow) : null;
  }

  public async create(
    moduleKey: CommonLocationModuleKey,
    params: CommonLocationUpsertParams,
  ): Promise<CommonLocationRecord> {
    const definition = getCommonLocationDefinition(moduleKey);
    const now = new Date();

    const [result] = await this.queryDatabase()
      .insertInto(definition.tableName)
      .values({
        ...toDatabasePayload(definition, params),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .execute();

    const record = await this.getById(moduleKey, String(result?.insertId ?? ""));

    if (!record) {
      throw new Error(`${definition.label} record was created but could not be read back.`);
    }

    return record;
  }

  public async update(
    moduleKey: CommonLocationModuleKey,
    id: string,
    params: CommonLocationUpsertParams,
  ): Promise<CommonLocationRecord | null> {
    const recordId = Number(id);
    const definition = getCommonLocationDefinition(moduleKey);
    await this.queryDatabase()
      .updateTable(definition.tableName)
      .set({
        ...toDatabasePayload(definition, params),
        updated_at: new Date(),
      })
      .where("id", "=", recordId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return this.getById(moduleKey, id);
  }

  public async softDelete(moduleKey: CommonLocationModuleKey, id: string): Promise<boolean> {
    const recordId = Number(id);
    const definition = getCommonLocationDefinition(moduleKey);
    const result = await this.queryDatabase()
      .updateTable(definition.tableName)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", recordId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }

  private queryDatabase() {
    return this.connection.db as unknown as DynamicQueryDatabase;
  }
}

function toDatabasePayload(
  definition: CommonLocationDefinition,
  params: CommonLocationUpsertParams,
) {
  const payload: Record<string, unknown> = {};
  for (const column of definition.writableColumns) {
    switch (column) {
      case "countryId":
        payload.country_id = params.countryId ?? null;
        break;
      case "stateId":
        payload.state_id = params.stateId ?? null;
        break;
      case "districtId":
        payload.district_id = params.districtId ?? null;
        break;
      case "cityId":
        payload.city_id = params.cityId ?? null;
        break;
      case "phoneCode":
        payload.phone_code = params.phoneCode?.trim() || null;
        break;
      case "areaName":
        payload.area_name = params.areaName?.trim() || null;
        break;
      case "isActive":
        payload.is_active = params.isActive;
        break;
      case "name":
        payload.name = params.name?.trim() ?? "";
        break;
      case "code":
        payload.code = params.code.trim();
        break;
      default:
        break;
    }
  }
  return payload;
}

function toCommonLocationRecord(row: CommonRow): CommonLocationRecord {
  return {
    id: row.id,
    countryId: row.country_id as number | null | undefined,
    stateId: row.state_id as number | null | undefined,
    districtId: row.district_id as number | null | undefined,
    cityId: row.city_id as number | null | undefined,
    code: row.code,
    name: row.name ?? null,
    phoneCode: row.phone_code as string | null | undefined,
    areaName: row.area_name as string | null | undefined,
    isActive: Boolean(row.is_active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
