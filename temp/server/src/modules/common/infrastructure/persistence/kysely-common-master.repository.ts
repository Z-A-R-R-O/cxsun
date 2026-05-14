import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { CommonMasterRepository } from "../../application/services/common-master.repository";
import type {
  CommonMasterRecord,
  CommonMasterUpsertParams,
} from "../../domain/entities/common-master-record";
import type {
  CommonMasterDefinition,
  CommonMasterModuleKey,
} from "../../domain/value-objects/common-master-definition";
import { getCommonMasterDefinition } from "../../domain/value-objects/common-master-definition";

type CommonMasterRow = Record<string, unknown> & {
  readonly id: number;
  readonly code: string | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly image?: string | null;
  readonly position_order?: number | string | null;
  readonly sort_order?: number | string | null;
  readonly hex_code?: string | null;
  readonly symbol?: string | null;
  readonly tax_type?: string | null;
  readonly rate_percent?: number | string | null;
  readonly is_default_location?: boolean | number | null;
  readonly country?: string | null;
  readonly state?: string | null;
  readonly district?: string | null;
  readonly city?: string | null;
  readonly pincode?: string | null;
  readonly address_line1?: string | null;
  readonly address_line2?: string | null;
  readonly decimal_places?: number | string | null;
  readonly due_days?: number | string | null;
  readonly start_date?: Date | string | null;
  readonly end_date?: Date | string | null;
  readonly books_start?: Date | string | null;
  readonly show_on_storefront_top_menu?: boolean | number | null;
  readonly show_on_storefront_catalog?: boolean | number | null;
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
  deleteFrom(tableName: string): DynamicQueryBuilder;
}

@Injectable()
export class KyselyCommonMasterRepository implements CommonMasterRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(moduleKey: CommonMasterModuleKey): Promise<readonly CommonMasterRecord[]> {
    const definition = getCommonMasterDefinition(moduleKey);
    const [sortColumn, sortDirection] = definition.listOrder;
    const rows = await this.queryDatabase()
      .selectFrom(definition.tableName)
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy(sortColumn, sortDirection)
      .execute();

    return (rows as CommonMasterRow[]).map((row) => toCommonMasterRecord(row));
  }

  public async getById(
    moduleKey: CommonMasterModuleKey,
    id: string,
  ): Promise<CommonMasterRecord | null> {
    const recordId = Number(id);
    const definition = getCommonMasterDefinition(moduleKey);
    const row = await this.queryDatabase()
      .selectFrom(definition.tableName)
      .selectAll()
      .where("id", "=", recordId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row ? toCommonMasterRecord(row as CommonMasterRow) : null;
  }

  public async create(
    moduleKey: CommonMasterModuleKey,
    params: CommonMasterUpsertParams,
  ): Promise<CommonMasterRecord> {
    const definition = getCommonMasterDefinition(moduleKey);
    const now = new Date();

    await this.ensureUniqueAccountingYear(moduleKey, params);

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
    moduleKey: CommonMasterModuleKey,
    id: string,
    params: CommonMasterUpsertParams,
  ): Promise<CommonMasterRecord | null> {
    const recordId = Number(id);
    const definition = getCommonMasterDefinition(moduleKey);
    await this.ensureUniqueAccountingYear(moduleKey, params, recordId);
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

  public async softDelete(moduleKey: CommonMasterModuleKey, id: string): Promise<boolean> {
    const recordId = Number(id);
    const definition = getCommonMasterDefinition(moduleKey);
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

  public async forceDelete(moduleKey: CommonMasterModuleKey, id: string): Promise<boolean> {
    const recordId = Number(id);
    const definition = getCommonMasterDefinition(moduleKey);
    const result = await this.queryDatabase()
      .deleteFrom(definition.tableName)
      .where("id", "=", recordId)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  private queryDatabase() {
    return this.connection.db as unknown as DynamicQueryDatabase;
  }

  private async ensureUniqueAccountingYear(
    moduleKey: CommonMasterModuleKey,
    params: CommonMasterUpsertParams,
    currentRecordId?: number,
  ) {
    if (moduleKey !== "accountingYear") {
      return;
    }

    const name = params.name?.trim() ?? "";
    const startDate = params.startDate?.trim() ?? "";
    const endDate = params.endDate?.trim() ?? "";

    if (!name || !startDate || !endDate) {
      return;
    }

    let query = this.queryDatabase()
      .selectFrom("accounting_years")
      .selectAll()
      .where("name", "=", name)
      .where("start_date", "=", startDate)
      .where("end_date", "=", endDate)
      .where("deleted_at", "is", null);

    if (currentRecordId) {
      query = query.where("id", "!=", currentRecordId);
    }

    const existingRecord = await query.executeTakeFirst();

    if (existingRecord) {
      throw new Error("Accounting year already exists.");
    }
  }
}

function toDatabasePayload(
  definition: CommonMasterDefinition,
  params: CommonMasterUpsertParams,
) {
  const payload: Record<string, unknown> = {};
  for (const column of definition.writableColumns) {
    switch (column) {
      case "isActive":
        payload.is_active = params.isActive;
        break;
      case "code":
        payload.code = params.code?.trim() || null;
        break;
      case "name":
        payload.name = params.name?.trim() || null;
        break;
      case "description":
        payload.description = params.description?.trim() || null;
        break;
      case "image":
        payload.image = params.image?.trim() || null;
        break;
      case "positionOrder":
        payload.position_order =
          params.positionOrder === null || params.positionOrder === undefined
            ? 0
            : Number(params.positionOrder);
        break;
      case "sortOrder":
        payload.sort_order =
          params.sortOrder === null || params.sortOrder === undefined
            ? 0
            : Number(params.sortOrder);
        break;
      case "hexCode":
        payload.hex_code = params.hexCode?.trim() || null;
        break;
      case "symbol":
        payload.symbol = params.symbol?.trim() || null;
        break;
      case "taxType":
        payload.tax_type = params.taxType?.trim() || null;
        break;
      case "ratePercent":
        payload.rate_percent =
          params.ratePercent === null || params.ratePercent === undefined
            ? 0
            : Number(params.ratePercent);
        break;
      case "isDefaultLocation":
        payload.is_default_location = Boolean(params.isDefaultLocation);
        break;
      case "country":
        payload.country = params.country?.trim() || null;
        break;
      case "state":
        payload.state = params.state?.trim() || null;
        break;
      case "district":
        payload.district = params.district?.trim() || null;
        break;
      case "city":
        payload.city = params.city?.trim() || null;
        break;
      case "pincode":
        payload.pincode = params.pincode?.trim() || null;
        break;
      case "addressLine1":
        payload.address_line1 = params.addressLine1?.trim() || null;
        break;
      case "addressLine2":
        payload.address_line2 = params.addressLine2?.trim() || null;
        break;
      case "decimalPlaces":
        payload.decimal_places =
          params.decimalPlaces === null || params.decimalPlaces === undefined
            ? 0
            : Number(params.decimalPlaces);
        break;
      case "dueDays":
        payload.due_days =
          params.dueDays === null || params.dueDays === undefined ? 0 : Number(params.dueDays);
        break;
      case "startDate":
        payload.start_date = params.startDate?.trim() || null;
        break;
      case "endDate":
        payload.end_date = params.endDate?.trim() || null;
        break;
      case "booksStart":
        payload.books_start = params.booksStart?.trim() || null;
        break;
      case "showOnStorefrontTopMenu":
        payload.show_on_storefront_top_menu = Boolean(params.showOnStorefrontTopMenu);
        break;
      case "showOnStorefrontCatalog":
        payload.show_on_storefront_catalog = Boolean(params.showOnStorefrontCatalog);
        break;
      default:
        break;
    }
  }
  return payload;
}

function toCommonMasterRecord(row: CommonMasterRow): CommonMasterRecord {
  return {
    id: Number(row.id),
    code: row.code ?? null,
    name: row.name ?? null,
    description: row.description ?? null,
    image: row.image ?? null,
    positionOrder:
      row.position_order === null || row.position_order === undefined
        ? null
        : Number(row.position_order),
    sortOrder:
      row.sort_order === null || row.sort_order === undefined ? null : Number(row.sort_order),
    hexCode: row.hex_code ?? null,
    symbol: row.symbol ?? null,
    taxType: row.tax_type ?? null,
    ratePercent:
      row.rate_percent === null || row.rate_percent === undefined
        ? null
        : Number(row.rate_percent),
    isDefaultLocation:
      row.is_default_location === null || row.is_default_location === undefined
        ? null
        : Boolean(row.is_default_location),
    country: row.country ?? null,
    state: row.state ?? null,
    district: row.district ?? null,
    city: row.city ?? null,
    pincode: row.pincode ?? null,
    addressLine1: row.address_line1 ?? null,
    addressLine2: row.address_line2 ?? null,
    decimalPlaces:
      row.decimal_places === null || row.decimal_places === undefined
        ? null
        : Number(row.decimal_places),
    dueDays: row.due_days === null || row.due_days === undefined ? null : Number(row.due_days),
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    booksStart: toDateOnly(row.books_start),
    showOnStorefrontTopMenu:
      row.show_on_storefront_top_menu === null ||
      row.show_on_storefront_top_menu === undefined
        ? null
        : Boolean(row.show_on_storefront_top_menu),
    showOnStorefrontCatalog:
      row.show_on_storefront_catalog === null || row.show_on_storefront_catalog === undefined
        ? null
        : Boolean(row.show_on_storefront_catalog),
    isActive: Boolean(row.is_active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return value.slice(0, 10);
}
