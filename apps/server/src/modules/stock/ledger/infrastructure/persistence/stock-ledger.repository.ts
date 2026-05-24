import { sql, type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../../../../core/exceptions/http.exception.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
import type { StockBarcodeMode, StockLedgerEntry, StockSerialization, StockSerializationItem, StockSerializationMode } from '../../domain/entities/stock-ledger.entity.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export interface StockLedgerSettingsInput {
  company_id?: number
  serialization_enabled?: boolean
  batch_enabled?: boolean
  default_warehouse_id?: string | null
  default_warehouse_name?: string | null
  serial_format?: string
  batch_format?: string
  barcode_format?: string
  barcode_mode?: StockBarcodeMode
}

export interface GenerateSerializationInput {
  stock_ledger_entry_uuid?: string
  stock_ledger_entry_id?: number
  purchase_receipt_uuid?: string
  purchase_receipt_id?: number
  purchase_receipt_item_id?: number
  purchase_receipt_item_uuid?: string
  warehouse_id?: string | null
  warehouse_name?: string | null
  quantity?: number
  mode?: StockSerializationMode
  batch_no?: string | null
}

export interface StockLedgerEntryInput {
  uuid?: string
  entry_no?: string
  entry_date?: string
  purchase_receipt_uuid?: string | null
  source_uuid?: string | null
  source_no?: string | null
  notes?: string | null
  status?: string
}

export interface VerifySerializationInput {
  barcode?: string
  barcodes?: string[]
}

@Injectable()
export class StockLedgerRepository {
  async listEntries(context: TenantRuntimeContext): Promise<StockLedgerEntry[]> {
    const rows = await this.database(context)
      .selectFrom('stock_ledger_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
      .orderBy('entry_date', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.entryFromRow(context, row)))
  }

  async findEntry(context: TenantRuntimeContext, idOrUuid: string | number): Promise<StockLedgerEntry | null> {
    const row = await this.database(context)
      .selectFrom('stock_ledger_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(String(idOrUuid)), '=', this.idValue(String(idOrUuid)))
      .executeTakeFirst()
    return row ? this.entryFromRow(context, row) : null
  }

  async upsertEntry(context: TenantRuntimeContext, input: StockLedgerEntryInput) {
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    const entryDate = input.entry_date?.trim() || new Date().toISOString().slice(0, 10)
    const sourceUuid = emptyAsNull(input.purchase_receipt_uuid) ?? emptyAsNull(input.source_uuid)
    const sourceReceipt = sourceUuid ? await this.findReceipt(context, sourceUuid) : null
    const patch = {
      entry_no: input.entry_no?.trim() || await this.nextEntryNo(context, companyId, accountingYearId),
      entry_date: entryDate,
      status: input.status?.trim() || 'draft',
      source_type: 'purchaseReceipt',
      source_uuid: sourceUuid,
      source_no: emptyAsNull(input.source_no) ?? stringOrNull(sourceReceipt?.entry_no),
      notes: emptyAsNull(input.notes),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (input.uuid) {
      const existing = await this.findEntry(context, input.uuid)
      if (!existing) throw new NotFoundException('Stock ledger entry was not found.')
      await this.database(context)
        .updateTable('stock_ledger_entries')
        .set(patch)
        .where('id', '=', existing.id)
        .execute()
      return this.findEntry(context, existing.id)
    }

    const result = await this.database(context)
      .insertInto('stock_ledger_entries')
      .values({
        uuid: this.nextUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        ...patch,
        created_by: context.user.email,
      })
      .executeTakeFirst()
    return this.findEntry(context, Number(result.insertId))
  }

  async getSettings(context: TenantRuntimeContext, companyId = 0): Promise<Record<string, unknown>> {
    const resolvedCompanyId = companyId || await this.defaultCompanyId(context)
    const existing = await this.database(context)
      .selectFrom('stock_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', resolvedCompanyId)
      .executeTakeFirst()

    if (existing) return existing

    await this.database(context)
      .insertInto('stock_settings')
      .values({
        uuid: this.nextUuid(),
        tenant_id: context.tenant.id,
        company_id: resolvedCompanyId,
        serialization_enabled: true,
        batch_enabled: true,
        default_warehouse_id: null,
        default_warehouse_name: null,
        serial_format: '{####}',
        batch_format: '{yy}{week}',
        barcode_format: '{productCode}-{batchNo}-{serialNo}',
        barcode_mode: 'readable',
      })
      .execute()

    return this.getSettings(context, resolvedCompanyId)
  }

  async upsertSettings(context: TenantRuntimeContext, input: StockLedgerSettingsInput) {
    const companyId = input.company_id || await this.defaultCompanyId(context)
    const current = await this.getSettings(context, companyId)
    const patch = {
      serialization_enabled: input.serialization_enabled ?? Boolean(current.serialization_enabled),
      batch_enabled: input.batch_enabled ?? Boolean(current.batch_enabled),
      default_warehouse_id: emptyAsNull(input.default_warehouse_id),
      default_warehouse_name: emptyAsNull(input.default_warehouse_name),
      serial_format: input.serial_format?.trim() || String(current.serial_format),
      batch_format: input.batch_format?.trim() || String(current.batch_format),
      barcode_format: input.barcode_format?.trim() || String(current.barcode_format),
      barcode_mode: input.barcode_mode === 'numeric' ? 'numeric' : 'readable',
      updated_at: new Date(),
    }

    await this.database(context)
      .updateTable('stock_settings')
      .set(patch)
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .execute()

    return this.getSettings(context, companyId)
  }

  async receiptIntake(context: TenantRuntimeContext, idOrUuid: string) {
    const receipt = await this.findReceipt(context, idOrUuid)
    if (!receipt) throw new NotFoundException('Purchase receipt was not found.')
    const items = await this.database(context)
      .selectFrom('stock_purchase_receipt_items')
      .selectAll()
      .where('purchase_receipt_id', '=', Number(receipt.id))
      .orderBy('sort_order', 'asc')
      .execute()

    const serializationRows = await this.database(context)
      .selectFrom('stock_serializations')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('purchase_receipt_id', '=', Number(receipt.id))
      .execute()
    const serializations = await Promise.all(serializationRows.map((row) => this.findSerialization(context, Number(row.id))))

    return {
      receipt,
      items: items.map((item) => {
        const generatedQuantity = sum(serializations.filter((row) => Number(row?.purchase_receipt_item_id) === Number(item.id)).map((row) => numberValue(row?.generated_quantity)))
        const quantity = numberValue(item.quantity)
        return {
          ...item,
          quantity,
          generated_quantity: generatedQuantity,
          pending_quantity: Math.max(0, quantity - generatedQuantity),
        }
      }),
      serializations: serializations.filter((row): row is StockSerialization => Boolean(row)),
    }
  }

  async generateSerialization(context: TenantRuntimeContext, input: GenerateSerializationInput) {
    const receipt = await this.findReceipt(context, input.purchase_receipt_uuid ?? String(input.purchase_receipt_id ?? ''))
    if (!receipt) throw new NotFoundException('Purchase receipt was not found.')
    const entry = await this.resolveEntryForSerialization(context, input, receipt)

    const item = await this.findReceiptItem(context, Number(receipt.id), input)
    if (!item) throw new NotFoundException('Purchase receipt item was not found.')

    const settings = await this.getSettings(context, Number(receipt.company_id))
    const mode = input.mode ?? 'partial'
    const itemQuantity = numberValue(item.quantity)
    const requestedQuantity = mode === 'full' ? itemQuantity : mode === 'single' ? 1 : numberValue(input.quantity)
    const quantity = Math.max(0, Math.min(itemQuantity, requestedQuantity))
    if (quantity <= 0) throw new BadRequestException('Quantity is required.')

    const batchNo = input.batch_no?.trim() || renderBatch(String(settings.batch_format))
    const productCode = await this.productCode(context, stringOrNull(item.product_id), String(item.product_name))
    const existingGenerated = await this.generatedQuantityForReceiptItem(context, Number(receipt.id), Number(item.id))
    const serialRows = Array.from({ length: Math.ceil(quantity) }, (_, index) => {
      const serialNo = renderSerial(String(settings.serial_format), existingGenerated + index + 1)
      const barcodeValue = renderBarcode({
        barcodeFormat: String(settings.barcode_format),
        barcodeMode: String(settings.barcode_mode) === 'numeric' ? 'numeric' : 'readable',
        batchNo,
        productCode,
        serialNo,
      })
      return { serialNo, barcodeValue }
    })

    const database = this.database(context)
    const result = await database
      .insertInto('stock_serializations')
      .values({
        uuid: this.nextUuid(),
        stock_ledger_entry_id: entry?.id ?? null,
        tenant_id: context.tenant.id,
        company_id: Number(receipt.company_id),
        accounting_year_id: Number(receipt.accounting_year_id),
        purchase_receipt_id: Number(receipt.id),
        purchase_receipt_uuid: String(receipt.uuid),
        purchase_receipt_no: String(receipt.entry_no),
        purchase_receipt_date: String(receipt.entry_date),
        purchase_receipt_item_id: Number(item.id),
        purchase_receipt_item_uuid: stringOrNull(item.uuid),
        product_id: stringOrNull(item.product_id),
        product_code: productCode,
        product_name: String(item.product_name),
        warehouse_id: emptyAsNull(input.warehouse_id) ?? stringOrNull(settings.default_warehouse_id),
        warehouse_name: emptyAsNull(input.warehouse_name) ?? stringOrNull(settings.default_warehouse_name),
        expected_quantity: itemQuantity,
        generated_quantity: serialRows.length,
        verified_quantity: 0,
        pending_quantity: serialRows.length,
        mode,
        batch_no: batchNo,
        serial_format: String(settings.serial_format),
        barcode_format: String(settings.barcode_format),
        barcode_mode: String(settings.barcode_mode),
        status: 'draft',
        created_by: context.user.email,
      })
      .executeTakeFirst()

    const serializationId = Number(result.insertId)
    await database
      .insertInto('stock_serialization_items')
      .values(serialRows.map((row) => ({
        uuid: this.nextUuid(),
        serialization_id: serializationId,
        serial_no: row.serialNo,
        batch_no: batchNo,
        barcode_value: row.barcodeValue,
        quantity: 1,
        is_verified: false,
      })))
      .execute()

    return this.findSerialization(context, serializationId)
  }

  async verifySerialization(context: TenantRuntimeContext, idOrUuid: string, input: VerifySerializationInput) {
    const serialization = await this.findSerialization(context, idOrUuid)
    if (!serialization) throw new NotFoundException('Serialization was not found.')
    const scans = [...(input.barcodes ?? []), input.barcode].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
    if (!scans.length) throw new BadRequestException('Barcode scan is required.')

    const items = await this.database(context)
      .selectFrom('stock_serialization_items')
      .selectAll()
      .where('serialization_id', '=', serialization.id)
      .execute()
    const known = new Set(items.map((item) => String(item.barcode_value)))
    const unknown = scans.filter((barcode) => !known.has(barcode))
    const matched = scans.filter((barcode) => known.has(barcode))

    if (matched.length) {
      await this.database(context)
        .updateTable('stock_serialization_items')
        .set({ is_verified: true, verified_at: new Date(), verified_by: context.user.email })
        .where('serialization_id', '=', serialization.id)
        .where('barcode_value', 'in', matched)
        .execute()
    }

    await this.refreshSerializationCounts(context, serialization.id)
    if (serialization.stock_ledger_entry_id) await this.refreshEntryStatus(context, serialization.stock_ledger_entry_id)
    const updated = await this.findSerialization(context, serialization.id)
    return { serialization: updated, matched, unknown }
  }

  async postSerialization(context: TenantRuntimeContext, idOrUuid: string) {
    const serialization = await this.findSerialization(context, idOrUuid)
    if (!serialization) throw new NotFoundException('Serialization was not found.')
    const verifiedItems = serialization.items.filter((item) => item.is_verified && !item.stock_movement_id)
    if (!verifiedItems.length) throw new BadRequestException('No verified serials are pending for posting.')

    for (const item of verifiedItems) {
      const movementId = await this.insertMovement(context, serialization, item)
      await this.upsertLiveBalance(context, serialization, item, movementId)
      await this.database(context)
        .updateTable('stock_serialization_items')
        .set({ stock_movement_id: movementId })
        .where('id', '=', item.id)
        .execute()
    }

    await this.database(context)
      .updateTable('stock_serializations')
      .set({ status: 'posted', updated_at: new Date() })
      .where('id', '=', serialization.id)
      .execute()
    if (serialization.stock_ledger_entry_id) await this.refreshEntryStatus(context, serialization.stock_ledger_entry_id)

    return this.findSerialization(context, serialization.id)
  }

  async dropSerialization(context: TenantRuntimeContext, idOrUuid: string) {
    const serialization = await this.findSerialization(context, idOrUuid)
    if (!serialization) throw new NotFoundException('Serialization was not found.')
    const hasPostedItems = serialization.status === 'posted' || serialization.items.some((item) => item.stock_movement_id)
    if (hasPostedItems) throw new BadRequestException('Posted stock cannot be dropped or revised.')

    await this.database(context)
      .deleteFrom('stock_serialization_items')
      .where('serialization_id', '=', serialization.id)
      .execute()
    await this.database(context)
      .deleteFrom('stock_serializations')
      .where('id', '=', serialization.id)
      .execute()
    if (serialization.stock_ledger_entry_id) await this.refreshEntryStatus(context, serialization.stock_ledger_entry_id)

    return { ok: true }
  }

  async listBalances(context: TenantRuntimeContext) {
    return this.database(context)
      .selectFrom('stock_live_balances')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('updated_at', 'desc')
      .execute()
  }

  async checkBarcodeAvailability(context: TenantRuntimeContext, barcode: string) {
    const row = await this.database(context)
      .selectFrom('stock_live_balances')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('barcode_value', '=', barcode)
      .executeTakeFirst()

    return {
      barcode,
      known: Boolean(row),
      available: numberValue(row?.quantity_available) > 0,
      balance: row ?? null,
    }
  }

  async findSerialization(context: TenantRuntimeContext, idOrUuid: string | number): Promise<StockSerialization | null> {
    const row = await this.database(context)
      .selectFrom('stock_serializations')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(String(idOrUuid)), '=', this.idValue(String(idOrUuid)))
      .executeTakeFirst()

    if (!row) return null
    const items = await this.database(context)
      .selectFrom('stock_serialization_items')
      .selectAll()
      .where('serialization_id', '=', Number(row.id))
      .orderBy('id', 'asc')
      .execute()

    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      stock_ledger_entry_id: row.stock_ledger_entry_id === null || row.stock_ledger_entry_id === undefined ? null : Number(row.stock_ledger_entry_id),
      tenant_id: Number(row.tenant_id),
      company_id: Number(row.company_id),
      accounting_year_id: Number(row.accounting_year_id),
      purchase_receipt_id: Number(row.purchase_receipt_id),
      purchase_receipt_uuid: String(row.purchase_receipt_uuid),
      purchase_receipt_no: String(row.purchase_receipt_no),
      purchase_receipt_date: String(row.purchase_receipt_date),
      purchase_receipt_item_id: Number(row.purchase_receipt_item_id),
      purchase_receipt_item_uuid: stringOrNull(row.purchase_receipt_item_uuid),
      product_id: stringOrNull(row.product_id),
      product_code: stringOrNull(row.product_code),
      product_name: String(row.product_name),
      warehouse_id: stringOrNull(row.warehouse_id),
      warehouse_name: stringOrNull(row.warehouse_name),
      expected_quantity: numberValue(row.expected_quantity),
      generated_quantity: numberValue(row.generated_quantity),
      verified_quantity: numberValue(row.verified_quantity),
      pending_quantity: numberValue(row.pending_quantity),
      mode: String(row.mode) as StockSerializationMode,
      batch_no: stringOrNull(row.batch_no),
      serial_format: String(row.serial_format),
      barcode_format: String(row.barcode_format),
      barcode_mode: String(row.barcode_mode) as StockBarcodeMode,
      status: String(row.status) as StockSerialization['status'],
      created_by: String(row.created_by),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      items: items.map(toSerializationItem),
    }
  }

  private async entryFromRow(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<StockLedgerEntry> {
    const serializationRows = await this.database(context)
      .selectFrom('stock_serializations')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('stock_ledger_entry_id', '=', Number(row.id))
      .orderBy('id', 'asc')
      .execute()
    const serializations = (await Promise.all(serializationRows.map((serialization) => this.findSerialization(context, Number(serialization.id))))).filter((item): item is StockSerialization => Boolean(item))
    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: Number(row.company_id),
      accounting_year_id: Number(row.accounting_year_id),
      entry_no: String(row.entry_no),
      entry_date: String(row.entry_date),
      status: String(row.status),
      source_type: String(row.source_type),
      source_uuid: stringOrNull(row.source_uuid),
      source_no: stringOrNull(row.source_no),
      notes: stringOrNull(row.notes),
      created_by: String(row.created_by),
      updated_by: stringOrNull(row.updated_by),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: row.deleted_at as Date | null,
      generated_quantity: sum(serializations.map((item) => numberValue(item.generated_quantity))),
      verified_quantity: sum(serializations.map((item) => numberValue(item.verified_quantity))),
      posted_quantity: sum(serializations.map((item) => item.status === 'posted' ? numberValue(item.verified_quantity) : 0)),
      serializations,
    }
  }

  private async resolveEntryForSerialization(context: TenantRuntimeContext, input: GenerateSerializationInput, receipt: Record<string, unknown>) {
    const idOrUuid = input.stock_ledger_entry_uuid ?? String(input.stock_ledger_entry_id ?? '')
    if (idOrUuid) {
      const entry = await this.findEntry(context, idOrUuid)
      if (!entry) throw new NotFoundException('Stock ledger entry was not found.')
      return entry
    }
    return this.upsertEntry(context, {
      entry_date: String(receipt.entry_date),
      purchase_receipt_uuid: String(receipt.uuid),
      source_no: String(receipt.entry_no),
    })
  }

  private async refreshEntryStatus(context: TenantRuntimeContext, entryId: number) {
    const entry = await this.findEntry(context, entryId)
    if (!entry) return
    const status = entry.serializations.length === 0
      ? 'draft'
      : entry.serializations.every((item) => item.status === 'posted')
        ? 'posted'
        : entry.verified_quantity > 0
          ? 'verified'
          : 'draft'
    await this.database(context)
      .updateTable('stock_ledger_entries')
      .set({ status, updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', entryId)
      .execute()
  }

  private async insertMovement(context: TenantRuntimeContext, serialization: StockSerialization, item: StockSerializationItem) {
    const result = await this.database(context)
      .insertInto('stock_ledger_movements')
      .values({
        uuid: this.nextUuid(),
        tenant_id: context.tenant.id,
        company_id: serialization.company_id,
        accounting_year_id: serialization.accounting_year_id,
        warehouse_id: serialization.warehouse_id,
        warehouse_name: serialization.warehouse_name,
        product_id: serialization.product_id,
        product_code: serialization.product_code,
        product_name: serialization.product_name,
        source_type: 'purchaseReceipt',
        source_id: String(serialization.purchase_receipt_id),
        source_uuid: serialization.purchase_receipt_uuid,
        source_no: serialization.purchase_receipt_no,
        source_date: serialization.purchase_receipt_date,
        direction: 'inward',
        quantity_in: item.quantity,
        quantity_out: 0,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
        barcode_value: item.barcode_value,
        status: 'posted',
        actor_email: context.user.email,
      })
      .executeTakeFirst()
    return Number(result.insertId)
  }

  private async upsertLiveBalance(context: TenantRuntimeContext, serialization: StockSerialization, item: StockSerializationItem, movementId: number) {
    const existing = await this.database(context)
      .selectFrom('stock_live_balances')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', serialization.company_id)
      .where('accounting_year_id', '=', serialization.accounting_year_id)
      .where('barcode_value', '=', item.barcode_value)
      .executeTakeFirst()

    if (existing) {
      const quantityOnHand = numberValue(existing.quantity_on_hand) + item.quantity
      const quantityReserved = numberValue(existing.quantity_reserved)
      await this.database(context)
        .updateTable('stock_live_balances')
        .set({ quantity_on_hand: quantityOnHand, quantity_available: quantityOnHand - quantityReserved, last_movement_id: movementId, updated_at: new Date() })
        .where('id', '=', Number(existing.id))
        .execute()
      return
    }

    await this.database(context)
      .insertInto('stock_live_balances')
      .values({
        uuid: this.nextUuid(),
        tenant_id: context.tenant.id,
        company_id: serialization.company_id,
        accounting_year_id: serialization.accounting_year_id,
        warehouse_id: serialization.warehouse_id,
        warehouse_name: serialization.warehouse_name,
        product_id: serialization.product_id,
        product_code: serialization.product_code,
        product_name: serialization.product_name,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
        barcode_value: item.barcode_value,
        quantity_on_hand: item.quantity,
        quantity_reserved: 0,
        quantity_available: item.quantity,
        last_movement_id: movementId,
      })
      .execute()
  }

  private async refreshSerializationCounts(context: TenantRuntimeContext, serializationId: number) {
    const counts = await sql<{ verified_quantity: string | number }>`
      SELECT COALESCE(SUM(CASE WHEN is_verified = 1 THEN quantity ELSE 0 END), 0) AS verified_quantity
      FROM stock_serialization_items
      WHERE serialization_id = ${serializationId}
    `.execute(this.database(context))
    const verifiedQuantity = numberValue(counts.rows[0]?.verified_quantity)
    const serialization = await this.findSerialization(context, serializationId)
    const generatedQuantity = numberValue(serialization?.generated_quantity)
    await this.database(context)
      .updateTable('stock_serializations')
      .set({
        verified_quantity: verifiedQuantity,
        pending_quantity: Math.max(0, generatedQuantity - verifiedQuantity),
        status: verifiedQuantity >= generatedQuantity ? 'verified' : verifiedQuantity > 0 ? 'partial' : 'draft',
        updated_at: new Date(),
      })
      .where('id', '=', serializationId)
      .execute()
  }

  private async findReceipt(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context)
      .selectFrom('stock_purchase_receipts')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .executeTakeFirst()
  }

  private async findReceiptItem(context: TenantRuntimeContext, receiptId: number, input: GenerateSerializationInput) {
    let query = this.database(context)
      .selectFrom('stock_purchase_receipt_items')
      .selectAll()
      .where('purchase_receipt_id', '=', receiptId)

    if (input.purchase_receipt_item_uuid) {
      query = query.where('uuid', '=', input.purchase_receipt_item_uuid)
    } else {
      query = query.where('id', '=', Number(input.purchase_receipt_item_id ?? 0))
    }

    return query.executeTakeFirst()
  }

  private async generatedQuantityForReceiptItem(context: TenantRuntimeContext, receiptId: number, itemId: number) {
    const result = await sql<{ generated_quantity: string | number }>`
      SELECT COALESCE(SUM(generated_quantity), 0) AS generated_quantity
      FROM stock_serializations
      WHERE tenant_id = ${context.tenant.id}
        AND purchase_receipt_id = ${receiptId}
        AND purchase_receipt_item_id = ${itemId}
    `.execute(this.database(context))
    return Math.floor(numberValue(result.rows[0]?.generated_quantity))
  }

  private async productCode(context: TenantRuntimeContext, productId: string | null, productName: string) {
    if (productId) {
      try {
        const product = await this.database(context)
          .selectFrom('masters_products')
          .select(['code', 'name'])
          .where('uuid', '=', productId)
          .executeTakeFirst()
        if (product?.code) return String(product.code)
      } catch {
        // Product masters are optional for legacy stock receipts; fall back to a stable item-derived code.
      }
    }

    return productName.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6) || 'ITEM'
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context)
      .selectFrom('companies')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('is_primary', '=', true)
      .executeTakeFirst()
    return Number(company?.id ?? 0)
  }

  private async defaultAccountingYearId(context: TenantRuntimeContext) {
    const defaults = await this.database(context)
      .selectFrom('default_companies')
      .select('accounting_year_id')
      .where('tenant_id', '=', context.tenant.id)
      .where('is_active', '=', true)
      .executeTakeFirst()
    if (defaults?.accounting_year_id) return Number(defaults.accounting_year_id)
    const year = await this.database(context)
      .selectFrom('accounting_years')
      .select('id')
      .where('is_current_year', '=', true)
      .executeTakeFirst()
    return Number(year?.id ?? 0)
  }

  private async nextEntryNo(context: TenantRuntimeContext, companyId: number, accountingYearId: number) {
    const rows = await this.database(context)
      .selectFrom('stock_ledger_entries')
      .select('entry_no')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .orderBy('id', 'desc')
      .limit(1)
      .execute()
    const lastNo = String(rows[0]?.entry_no ?? '')
    const nextNumber = (Number(lastNo.match(/(\d+)$/)?.[1] ?? 0) || 0) + 1
    return `SL-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`
  }

  private idColumn(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
  }

  private idValue(idOrUuid: string) {
    return this.idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
  }

  private nextUuid() {
    return dispatchPublicUuid()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSerializationItem(row: Record<string, unknown>): StockSerializationItem {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    serialization_id: Number(row.serialization_id),
    serial_no: String(row.serial_no),
    batch_no: stringOrNull(row.batch_no),
    barcode_value: String(row.barcode_value),
    quantity: numberValue(row.quantity),
    is_verified: Boolean(row.is_verified),
    verified_at: row.verified_at as Date | null,
    verified_by: stringOrNull(row.verified_by),
    stock_movement_id: row.stock_movement_id === null || row.stock_movement_id === undefined ? null : Number(row.stock_movement_id),
    created_at: row.created_at as Date,
  }
}

function renderBatch(format: string) {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const week = String(Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, '0')
  return format.replaceAll('{yy}', year).replaceAll('{week}', week)
}

function renderSerial(format: string, sequence: number) {
  return format
    .replaceAll('{serial4}', String(sequence).padStart(4, '0'))
    .replace(/\{(#+)\}/g, (_match, hashes: string) => String(sequence).padStart(hashes.length, '0'))
    .replaceAll('{serial}', String(sequence))
}

function renderBarcode(input: { barcodeFormat: string; barcodeMode: StockBarcodeMode; batchNo: string; productCode: string; serialNo: string }) {
  const readable = input.barcodeFormat
    .replaceAll('{productCode}', input.productCode)
    .replaceAll('{batchNo}', input.batchNo)
    .replaceAll('{serialNo}', input.serialNo)

  if (input.barcodeMode === 'readable') return readable
  return readable.replace(/[^0-9]/g, '').padStart(12, '0').slice(-12)
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}
