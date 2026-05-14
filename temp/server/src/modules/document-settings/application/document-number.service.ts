import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import type {
  DocumentEntryKind,
  DocumentNumberContext,
  DocumentNumberSettingInput,
  DocumentNumberSettingRecord,
} from "../domain/document-number-record";

type DynamicDatabase = Record<string, Record<string, unknown>>;

const documentKinds = ["sales", "purchase", "payment", "receipt"] as const;

@Injectable()
export class DocumentNumberService implements OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(context: DocumentNumberContext) {
    const records = await Promise.all(
      documentKinds.map((kind) => this.getOrCreateSetting(kind, context)),
    );
    return records;
  }

  public async updateMany(
    context: DocumentNumberContext,
    inputs: readonly DocumentNumberSettingInput[],
  ) {
    const updated = await Promise.all(
      inputs.map((input) => this.updateOne(context, normalizeKind(input.kind), input)),
    );
    const updatedKinds = new Set(updated.map((record) => record.kind));
    const remaining = await Promise.all(
      documentKinds
        .filter((kind) => !updatedKinds.has(kind))
        .map((kind) => this.getOrCreateSetting(kind, context)),
    );
    return [...updated, ...remaining].sort((left, right) => kindOrder(left.kind) - kindOrder(right.kind));
  }

  public async nextPreview(kind: DocumentEntryKind, context: DocumentNumberContext) {
    return this.getOrCreateSetting(kind, context);
  }

  public async reserveNext(kind: DocumentEntryKind, context: DocumentNumberContext) {
    const safeKind = normalizeKind(kind);
    return this.db().transaction().execute(async (transaction) => {
      await this.ensureSetting(safeKind, context, transaction);
      const row = await transaction
        .selectFrom("document_number_settings")
        .selectAll()
        .where("company_id", "=", Number(context.companyId))
        .where("accounting_year_id", "=", Number(context.accountingYearId))
        .where("entry_kind", "=", safeKind)
        .forUpdate()
        .executeTakeFirstOrThrow();
      const record = toRecord(row, context);
      if (!record.autoEnabled) {
        throw new Error(`${labelForKind(safeKind)} automatic numbering is disabled.`);
      }
      await transaction
        .updateTable("document_number_settings")
        .set({ next_number: record.nextNumber + 1, updated_at: new Date() })
        .where("id", "=", Number(record.id))
        .executeTakeFirst();
      return record.preview;
    });
  }

  private async updateOne(
    context: DocumentNumberContext,
    kind: DocumentEntryKind,
    input: DocumentNumberSettingInput,
  ) {
    const current = await this.getOrCreateSetting(kind, context);
    const next = {
      prefix: cleanPrefix(input.prefix ?? current.prefix),
      separator: cleanSeparator(input.separator ?? current.separator),
      next_number: clampInteger(input.nextNumber ?? current.nextNumber, 1, 999_999_999),
      padding: clampInteger(input.padding ?? current.padding, 1, 12),
      auto_enabled: Boolean(input.autoEnabled ?? current.autoEnabled),
      updated_at: new Date(),
    };
    await this.db()
      .updateTable("document_number_settings")
      .set(next)
      .where("id", "=", Number(current.id))
      .executeTakeFirst();
    return this.getOrCreateSetting(kind, context);
  }

  private async getOrCreateSetting(kind: DocumentEntryKind, context: DocumentNumberContext) {
    await this.ensureSetting(kind, context, this.db());
    const row = await this.db()
      .selectFrom("document_number_settings")
      .selectAll()
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("entry_kind", "=", kind)
      .executeTakeFirstOrThrow();
    return toRecord(row, context);
  }

  private async ensureSetting(
    kind: DocumentEntryKind,
    context: DocumentNumberContext,
    db: Kysely<DynamicDatabase>,
  ) {
    const existing = await db
      .selectFrom("document_number_settings")
      .select("id")
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("entry_kind", "=", kind)
      .executeTakeFirst();
    if (existing) return;

    const defaults = defaultSetting(kind);
    try {
      await db
        .insertInto("document_number_settings")
        .values({
          company_id: Number(context.companyId),
          accounting_year_id: Number(context.accountingYearId),
          entry_kind: kind,
          prefix: defaults.prefix,
          separator: "-",
          next_number: 1,
          padding: 4,
          auto_enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .executeTakeFirst();
    } catch {
      // A concurrent first request may have created the row.
    }
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function toRecord(
  row: Record<string, unknown>,
  context: DocumentNumberContext,
): DocumentNumberSettingRecord {
  const kind = normalizeKind(String(row.entry_kind));
  const nextNumber = Number(row.next_number ?? 1);
  const padding = Number(row.padding ?? 4);
  const prefix = String(row.prefix ?? defaultSetting(kind).prefix);
  const separator = String(row.separator ?? "-");
  return {
    id: String(row.id),
    accountingYearId: context.accountingYearId,
    autoEnabled: Boolean(row.auto_enabled),
    companyId: context.companyId,
    kind,
    nextNumber,
    padding,
    prefix,
    preview: formatDocumentNumber(prefix, separator, nextNumber, padding),
    separator,
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at as string),
  };
}

export function formatDocumentNumber(
  prefix: string,
  separator: string,
  nextNumber: number,
  padding: number,
) {
  const serial = String(nextNumber).padStart(padding, "0");
  return [prefix.trim(), serial].filter(Boolean).join(separator);
}

function defaultSetting(kind: DocumentEntryKind) {
  return {
    sales: { prefix: "SAL" },
    purchase: { prefix: "PUR" },
    payment: { prefix: "PAY" },
    receipt: { prefix: "REC" },
  }[kind];
}

function normalizeKind(value: string): DocumentEntryKind {
  if (documentKinds.includes(value as DocumentEntryKind)) return value as DocumentEntryKind;
  throw new Error(`Unsupported document kind "${value}".`);
}

function labelForKind(kind: DocumentEntryKind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function cleanPrefix(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase() ?? "";
  return trimmed;
}

function cleanSeparator(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "-";
  return trimmed.slice(0, 3) || "-";
}

function clampInteger(value: number | string | null | undefined, min: number, max: number) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue)) return min;
  return Math.min(max, Math.max(min, numericValue));
}

function kindOrder(kind: DocumentEntryKind) {
  return documentKinds.indexOf(kind);
}
