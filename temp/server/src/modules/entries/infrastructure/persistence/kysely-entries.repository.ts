import { randomUUID } from "node:crypto";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import type {
  AllocationRecord,
  BillingEntryKind,
  BillingEntryRecord,
  BillingItemRecord,
  MoneyEntryKind,
  MoneyEntryRecord,
} from "../../domain/entry-record";
import type {
  BillingEntryInput,
  EntriesRepository,
  EntryContextCriteria,
  MoneyEntryInput,
} from "../../application/services/entries.repository";
import {
  normalizeBillingInput,
  normalizeMoneyInput,
} from "../../application/use-cases/entry-normalizer";

type DynamicDatabase = Record<string, Record<string, unknown>>;
type DateValue = Date | string;

@Injectable()
export class KyselyEntriesRepository implements EntriesRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async listBilling(
    kind: BillingEntryKind,
    context: EntryContextCriteria,
  ): Promise<readonly BillingEntryRecord[]> {
    const table = billingTable(kind);
    const rows = await this.db()
      .selectFrom(table)
      .selectAll()
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .orderBy(kind === "sales" ? "invoice_date" : "bill_date", "desc")
      .execute();
    return Promise.all(rows.map((row) => this.toBillingRecord(kind, row)));
  }

  public async getBilling(
    kind: BillingEntryKind,
    entryId: string,
    context: EntryContextCriteria,
  ): Promise<BillingEntryRecord | null> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return null;
    const row = await this.db()
      .selectFrom(billingTable(kind))
      .selectAll()
      .where("id", "=", numericId)
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return row ? this.toBillingRecord(kind, row) : null;
  }

  public async createBilling(
    kind: BillingEntryKind,
    input: BillingEntryInput,
  ): Promise<BillingEntryRecord> {
    const normalized = normalizeBillingInput(kind, input);
    const now = new Date();
    const result = await this.db()
      .insertInto(billingTable(kind))
      .values(toBillingRow(kind, normalized, now, randomUUID()))
      .executeTakeFirstOrThrow();
    const entryId = Number(result.insertId);
    await this.replaceBillingItems(kind, entryId, normalized.items, now);
    const entry = await this.getBilling(kind, String(entryId), {
      companyId: normalized.companyId,
      accountingYearId: normalized.accountingYearId,
    });
    if (!entry) throw new Error("Billing entry was created but could not be read back.");
    return entry;
  }

  public async updateBilling(
    kind: BillingEntryKind,
    entryId: string,
    input: BillingEntryInput,
  ): Promise<BillingEntryRecord | null> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return null;
    const normalized = normalizeBillingInput(kind, input);
    const now = new Date();
    const result = await this.db()
      .updateTable(billingTable(kind))
      .set(toBillingUpdateRow(kind, normalized, now))
      .where("id", "=", numericId)
      .where("company_id", "=", Number(normalized.companyId))
      .where("accounting_year_id", "=", Number(normalized.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) return null;
    await this.replaceBillingItems(kind, numericId, normalized.items, now);
    return this.getBilling(kind, entryId, {
      companyId: normalized.companyId,
      accountingYearId: normalized.accountingYearId,
    });
  }

  public async softDeleteBilling(
    kind: BillingEntryKind,
    entryId: string,
    context: EntryContextCriteria,
  ): Promise<boolean> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return false;
    const result = await this.db()
      .updateTable(billingTable(kind))
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where("id", "=", numericId)
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  public async listMoney(
    kind: MoneyEntryKind,
    context: EntryContextCriteria,
  ): Promise<readonly MoneyEntryRecord[]> {
    const rows = await this.db()
      .selectFrom(moneyTable(kind))
      .selectAll()
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .orderBy(kind === "payment" ? "payment_date" : "receipt_date", "desc")
      .execute();
    return Promise.all(rows.map((row) => this.toMoneyRecord(kind, row)));
  }

  public async getMoney(
    kind: MoneyEntryKind,
    entryId: string,
    context: EntryContextCriteria,
  ): Promise<MoneyEntryRecord | null> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return null;
    const row = await this.db()
      .selectFrom(moneyTable(kind))
      .selectAll()
      .where("id", "=", numericId)
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return row ? this.toMoneyRecord(kind, row) : null;
  }

  public async createMoney(
    kind: MoneyEntryKind,
    input: MoneyEntryInput,
  ): Promise<MoneyEntryRecord> {
    const normalized = normalizeMoneyInput(kind, input);
    const now = new Date();
    const result = await this.db()
      .insertInto(moneyTable(kind))
      .values(toMoneyRow(kind, normalized, now, randomUUID()))
      .executeTakeFirstOrThrow();
    const entryId = Number(result.insertId);
    await this.replaceAllocations(kind, entryId, normalized.allocations, now);
    const entry = await this.getMoney(kind, String(entryId), {
      companyId: normalized.companyId,
      accountingYearId: normalized.accountingYearId,
    });
    if (!entry) throw new Error("Money entry was created but could not be read back.");
    return entry;
  }

  public async updateMoney(
    kind: MoneyEntryKind,
    entryId: string,
    input: MoneyEntryInput,
  ): Promise<MoneyEntryRecord | null> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return null;
    const normalized = normalizeMoneyInput(kind, input);
    const now = new Date();
    const result = await this.db()
      .updateTable(moneyTable(kind))
      .set(toMoneyUpdateRow(kind, normalized, now))
      .where("id", "=", numericId)
      .where("company_id", "=", Number(normalized.companyId))
      .where("accounting_year_id", "=", Number(normalized.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) return null;
    await this.replaceAllocations(kind, numericId, normalized.allocations, now);
    return this.getMoney(kind, entryId, {
      companyId: normalized.companyId,
      accountingYearId: normalized.accountingYearId,
    });
  }

  public async softDeleteMoney(
    kind: MoneyEntryKind,
    entryId: string,
    context: EntryContextCriteria,
  ): Promise<boolean> {
    const numericId = Number(entryId);
    if (!Number.isInteger(numericId)) return false;
    const result = await this.db()
      .updateTable(moneyTable(kind))
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where("id", "=", numericId)
      .where("company_id", "=", Number(context.companyId))
      .where("accounting_year_id", "=", Number(context.accountingYearId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  private async replaceBillingItems(
    kind: BillingEntryKind,
    entryId: number,
    items: ReturnType<typeof normalizeBillingInput>["items"],
    timestamp: Date,
  ) {
    const table = kind === "sales" ? "sales_items" : "purchase_items";
    await this.db().deleteFrom(table).where(parentIdColumn(kind), "=", entryId).execute();
    if (items.length === 0) return;
    await this.db()
      .insertInto(table)
      .values(items.map((item) => toBillingItemRow(kind, entryId, item, timestamp)))
      .execute();
  }

  private async replaceAllocations(
    kind: MoneyEntryKind,
    entryId: number,
    allocations: ReturnType<typeof normalizeMoneyInput>["allocations"],
    timestamp: Date,
  ) {
    const table = kind === "payment" ? "payment_allocations" : "receipt_allocations";
    await this.db().deleteFrom(table).where(parentIdColumn(kind), "=", entryId).execute();
    if (allocations.length === 0) return;
    await this.db()
      .insertInto(table)
      .values(allocations.map((item) => toAllocationRow(kind, entryId, item, timestamp)))
      .execute();
  }

  private async toBillingRecord(
    kind: BillingEntryKind,
    row: Record<string, unknown>,
  ): Promise<BillingEntryRecord> {
    const entryId = Number(row.id);
    const items = await this.db()
      .selectFrom(kind === "sales" ? "sales_items" : "purchase_items")
      .selectAll()
      .where(parentIdColumn(kind), "=", entryId)
      .orderBy("sort_order", "asc")
      .execute();
    return {
      id: String(entryId),
      uuid: String(row.uuid),
      kind,
      companyId: String(row.company_id),
      accountingYearId: String(row.accounting_year_id),
      documentNo: String(kind === "sales" ? row.invoice_no : row.bill_no),
      documentDate: toDate(kind === "sales" ? row.invoice_date : row.bill_date),
      partyId: stringOrNull(kind === "sales" ? row.customer_id : row.supplier_id),
      partyName: String(kind === "sales" ? row.customer_name : row.supplier_name),
      billingAddress: stringOrNull(row.billing_address),
      shippingAddress: stringOrNull(row.shipping_address),
      placeOfSupply: stringOrNull(row.place_of_supply),
      priceListId: stringOrNull(row.price_list_id),
      referenceNo: stringOrNull(row.reference_no),
      dueDate: dateOrNull(row.due_date),
      ewayBillNo: stringOrNull(row.eway_bill_no),
      ewayBillDate: dateOrNull(row.eway_bill_date),
      eInvoiceIrn: stringOrNull(row.e_invoice_irn),
      eInvoiceAckNo: stringOrNull(row.e_invoice_ack_no),
      eInvoiceAckDate: dateOrNull(row.e_invoice_ack_date),
      eInvoiceSignedQr: stringOrNull(row.e_invoice_signed_qr),
      supplierInvoiceNo: stringOrNull(row.supplier_invoice_no),
      supplierInvoiceDate: dateOrNull(row.supplier_invoice_date),
      subtotal: numberValue(row.subtotal),
      discountTotal: numberValue(row.discount_total),
      taxableTotal: numberValue(row.taxable_total),
      taxTotal: numberValue(row.tax_total),
      roundOff: numberValue(row.round_off),
      grandTotal: numberValue(row.grand_total),
      paidAmount: numberValue(row.paid_amount),
      balanceAmount: numberValue(row.balance_amount),
      status: String(row.status),
      paymentStatus: String(row.payment_status),
      notes: stringOrNull(row.notes),
      terms: stringOrNull(row.terms),
      isActive: Boolean(row.is_active),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: dateOrNull(row.deleted_at),
      items: items.map((item) => toBillingItemRecord(kind, item)),
    };
  }

  private async toMoneyRecord(
    kind: MoneyEntryKind,
    row: Record<string, unknown>,
  ): Promise<MoneyEntryRecord> {
    const entryId = Number(row.id);
    const allocations = await this.db()
      .selectFrom(kind === "payment" ? "payment_allocations" : "receipt_allocations")
      .selectAll()
      .where(parentIdColumn(kind), "=", entryId)
      .orderBy("sort_order", "asc")
      .execute();
    return {
      id: String(entryId),
      uuid: String(row.uuid),
      kind,
      companyId: String(row.company_id),
      accountingYearId: String(row.accounting_year_id),
      documentNo: String(kind === "payment" ? row.payment_no : row.receipt_no),
      documentDate: toDate(kind === "payment" ? row.payment_date : row.receipt_date),
      partyId: stringOrNull(row.party_id),
      partyName: String(row.party_name),
      partyType: stringOrNull(row.party_type),
      ledgerId: stringOrNull(row.ledger_id),
      ledgerName: stringOrNull(row.ledger_name),
      mode: String(kind === "payment" ? row.payment_mode : row.receipt_mode),
      bankAccountId: stringOrNull(row.bank_account_id),
      referenceNo: stringOrNull(row.reference_no),
      referenceDate: dateOrNull(row.reference_date),
      amount: numberValue(row.amount),
      tdsAmount: numberValue(row.tds_amount),
      discountAmount: numberValue(row.discount_amount),
      roundOff: numberValue(row.round_off),
      netAmount: numberValue(row.net_amount),
      allocatedAmount: numberValue(row.allocated_amount),
      unallocatedAmount: numberValue(row.unallocated_amount),
      status: String(row.status),
      notes: stringOrNull(row.notes),
      isActive: Boolean(row.is_active),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: dateOrNull(row.deleted_at),
      allocations: allocations.map((item) => toAllocationRecord(kind, item)),
    };
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function billingTable(kind: BillingEntryKind) {
  return kind === "sales" ? "sales" : "purchases";
}

function moneyTable(kind: MoneyEntryKind) {
  return kind === "payment" ? "payments" : "receipts";
}

function parentIdColumn(kind: BillingEntryKind | MoneyEntryKind) {
  return kind === "sales"
    ? "sale_id"
    : kind === "purchase"
      ? "purchase_id"
      : kind === "payment"
        ? "payment_id"
        : "receipt_id";
}

function toBillingRow(
  kind: BillingEntryKind,
  input: ReturnType<typeof normalizeBillingInput>,
  timestamp: Date,
  uuid: string,
) {
  const common = {
    uuid,
    company_id: Number(input.companyId),
    accounting_year_id: Number(input.accountingYearId),
    billing_address: input.billingAddress,
    place_of_supply: input.placeOfSupply,
    reference_no: input.referenceNo,
    due_date: input.dueDate,
    subtotal: input.subtotal,
    discount_total: input.discountTotal,
    taxable_total: input.taxableTotal,
    tax_total: input.taxTotal,
    round_off: input.roundOff,
    grand_total: input.grandTotal,
    paid_amount: input.paidAmount,
    balance_amount: input.balanceAmount,
    status: input.status,
    payment_status: input.paymentStatus,
    notes: input.notes,
    terms: input.terms,
    is_active: input.isActive,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
  return kind === "sales"
    ? {
        ...common,
        invoice_no: input.documentNo,
        invoice_date: input.documentDate,
        customer_id: input.partyId,
        customer_name: input.partyName,
        shipping_address: input.shippingAddress,
        price_list_id: input.priceListId,
        eway_bill_no: input.ewayBillNo,
        eway_bill_date: input.ewayBillDate,
        e_invoice_irn: input.eInvoiceIrn,
        e_invoice_ack_no: input.eInvoiceAckNo,
        e_invoice_ack_date: input.eInvoiceAckDate,
        e_invoice_signed_qr: input.eInvoiceSignedQr,
      }
    : {
        ...common,
        bill_no: input.documentNo,
        bill_date: input.documentDate,
        supplier_id: input.partyId,
        supplier_name: input.partyName,
        supplier_invoice_no: input.supplierInvoiceNo,
        supplier_invoice_date: input.supplierInvoiceDate,
      };
}

function toBillingUpdateRow(
  kind: BillingEntryKind,
  input: ReturnType<typeof normalizeBillingInput>,
  timestamp: Date,
) {
  const row = toBillingRow(kind, input, timestamp, "unused");
  delete (row as Record<string, unknown>).uuid;
  delete (row as Record<string, unknown>).created_at;
  delete (row as Record<string, unknown>).deleted_at;
  return row;
}

function toBillingItemRow(
  kind: BillingEntryKind,
  parentId: number,
  item: ReturnType<typeof normalizeBillingInput>["items"][number],
  timestamp: Date,
) {
  return {
    [parentIdColumn(kind)]: parentId,
    product_id: item.productId,
    product_name: item.productName,
    product_sku: item.productSku,
    po_no: item.poNo,
    dc_no: item.dcNo,
    description: item.description,
    size: item.size,
    colour: item.colour,
    area_sq: item.areaSq,
    hsn_code_id: item.hsnCodeId,
    unit_id: item.unitId,
    quantity: item.quantity,
    free_quantity: item.freeQuantity,
    rate: item.rate,
    mrp: item.mrp,
    discount_type: item.discountType,
    discount_value: item.discountValue,
    discount_amount: item.discountAmount,
    tax_id: item.taxId,
    tax_rate: item.taxRate,
    tax_amount: item.taxAmount,
    line_subtotal: item.lineSubtotal,
    line_total: item.lineTotal,
    sort_order: item.sortOrder,
    is_active: item.isActive,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function toMoneyRow(
  kind: MoneyEntryKind,
  input: ReturnType<typeof normalizeMoneyInput>,
  timestamp: Date,
  uuid: string,
) {
  const common = {
    uuid,
    company_id: Number(input.companyId),
    accounting_year_id: Number(input.accountingYearId),
    party_id: input.partyId,
    party_name: input.partyName,
    party_type: input.partyType,
    ledger_id: input.ledgerId,
    ledger_name: input.ledgerName,
    bank_account_id: input.bankAccountId,
    reference_no: input.referenceNo,
    reference_date: input.referenceDate,
    amount: input.amount,
    tds_amount: input.tdsAmount,
    discount_amount: input.discountAmount,
    round_off: input.roundOff,
    net_amount: input.netAmount,
    allocated_amount: input.allocatedAmount,
    unallocated_amount: input.unallocatedAmount,
    status: input.status,
    notes: input.notes,
    is_active: input.isActive,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
  return kind === "payment"
    ? {
        ...common,
        payment_no: input.documentNo,
        payment_date: input.documentDate,
        payment_mode: input.mode,
      }
    : {
        ...common,
        receipt_no: input.documentNo,
        receipt_date: input.documentDate,
        receipt_mode: input.mode,
      };
}

function toMoneyUpdateRow(
  kind: MoneyEntryKind,
  input: ReturnType<typeof normalizeMoneyInput>,
  timestamp: Date,
) {
  const row = toMoneyRow(kind, input, timestamp, "unused");
  delete (row as Record<string, unknown>).uuid;
  delete (row as Record<string, unknown>).created_at;
  delete (row as Record<string, unknown>).deleted_at;
  return row;
}

function toAllocationRow(
  kind: MoneyEntryKind,
  parentId: number,
  item: ReturnType<typeof normalizeMoneyInput>["allocations"][number],
  timestamp: Date,
) {
  return {
    [parentIdColumn(kind)]: parentId,
    document_type: item.documentType,
    document_id: item.documentId,
    document_no: item.documentNo,
    document_date: item.documentDate,
    document_total: item.documentTotal,
    previous_balance: item.previousBalance,
    allocated_amount: item.allocatedAmount,
    balance_after_allocation: item.balanceAfterAllocation,
    sort_order: item.sortOrder,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function toBillingItemRecord(
  kind: BillingEntryKind,
  row: Record<string, unknown>,
): BillingItemRecord {
  return {
    id: String(row.id),
    parentId: String(row[parentIdColumn(kind)]),
    productId: stringOrNull(row.product_id),
    productName: String(row.product_name),
    productSku: stringOrNull(row.product_sku),
    poNo: stringOrNull(row.po_no),
    dcNo: stringOrNull(row.dc_no),
    description: stringOrNull(row.description),
    size: stringOrNull(row.size),
    colour: stringOrNull(row.colour),
    areaSq: numberValue(row.area_sq),
    hsnCodeId: stringOrNull(row.hsn_code_id),
    unitId: stringOrNull(row.unit_id),
    quantity: numberValue(row.quantity),
    freeQuantity: numberValue(row.free_quantity),
    rate: numberValue(row.rate),
    mrp: numberValue(row.mrp),
    discountType: stringOrNull(row.discount_type),
    discountValue: numberValue(row.discount_value),
    discountAmount: numberValue(row.discount_amount),
    taxId: stringOrNull(row.tax_id),
    taxRate: numberValue(row.tax_rate),
    taxAmount: numberValue(row.tax_amount),
    lineSubtotal: numberValue(row.line_subtotal),
    lineTotal: numberValue(row.line_total),
    sortOrder: numberValue(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

function toAllocationRecord(kind: MoneyEntryKind, row: Record<string, unknown>): AllocationRecord {
  return {
    id: String(row.id),
    parentId: String(row[parentIdColumn(kind)]),
    documentType: String(row.document_type),
    documentId: stringOrNull(row.document_id),
    documentNo: String(row.document_no),
    documentDate: dateOrNull(row.document_date),
    documentTotal: numberValue(row.document_total),
    previousBalance: numberValue(row.previous_balance),
    allocatedAmount: numberValue(row.allocated_amount),
    balanceAfterAllocation: numberValue(row.balance_after_allocation),
    sortOrder: numberValue(row.sort_order),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function toDate(value: unknown) {
  return value instanceof Date ? value : new Date(value as DateValue);
}

function dateOrNull(value: unknown) {
  return value ? toDate(value) : null;
}
