import type { DashboardPage } from "src/components/blocks/sidebar/app-sidebar"
import type { MasterDataColumnDefinition, MasterDataModuleDefinition, MasterDataRecord, MasterDataUpsertInput } from "../domain/master-data"

export const pageModuleMap: Partial<Record<DashboardPage, string>> = {
  "app-billing-country": "countries",
  "app-billing-state": "states",
  "app-billing-district": "districts",
  "app-billing-city": "cities",
  "app-billing-pincode": "pincodes",
  "app-billing-contact-group": "contactGroups",
  "app-billing-contact-type": "contactTypes",
  "app-billing-address-type": "addressTypes",
  "app-billing-bank-name": "bankNames",
  "app-billing-product-group": "productGroups",
  "app-billing-category": "productCategories",
  "app-billing-product-type": "productTypes",
  "app-billing-hsn-code": "hsnCodes",
  "app-billing-brand": "brands",
  "app-billing-colour": "colours",
  "app-billing-size": "sizes",
  "app-billing-unit": "units",
  "app-billing-tax": "taxes",
  "app-billing-currency": "currencies",
  "app-billing-priority": "priorities",
  "app-billing-order-type": "orderTypes",
  "app-billing-style": "styles",
  "app-billing-transport": "transports",
  "app-billing-warehouse": "warehouses",
  "app-billing-destination": "destinations",
  "app-billing-payment-term": "paymentTerms",
  "app-billing-sales-type": "salesAccountTypes",
  "app-billing-accounting-year": "accountingYear",
  "app-billing-month": "months",
  "app-billing-stock-rejection-type": "stockRejectionTypes",
  "app-billing-contact": "contacts",
  "app-auditor-contact": "contacts",
  "app-billing-product": "products",
  "app-billing-order": "orders",
  "app-inventory-category": "productCategories",
  "app-inventory-contact": "contacts",
  "app-inventory-product": "products",
  "app-inventory-order": "orders",
  "app-inventory-product-group": "productGroups",
  "app-inventory-brand": "brands",
  "app-inventory-colour": "colours",
  "app-inventory-currency": "currencies",
  "app-inventory-priority": "priorities",
  "app-inventory-destination": "destinations",
  "app-inventory-hsn-code": "hsnCodes",
  "app-inventory-month": "months",
  "app-inventory-order-type": "orderTypes",
  "app-inventory-payment-term": "paymentTerms",
  "app-inventory-product-type": "productTypes",
  "app-inventory-size": "sizes",
  "app-inventory-stock-rejection-type": "stockRejectionTypes",
  "app-inventory-style": "styles",
  "app-inventory-tax": "taxes",
  "app-inventory-transport": "transports",
  "app-inventory-unit": "units",
  "app-inventory-warehouse": "warehouses",
  "app-inventory-warehouses": "warehouses",
  "app-inventory-suppliers": "contacts",
  "app-crm-contacts": "contacts",
}

const masterModuleKeys = new Set(["contacts", "products", "orders"])

export function pageModuleKey(page: DashboardPage) {
  return pageModuleMap[page] ?? null
}

export function pageModuleKind(moduleKey: string) {
  return masterModuleKeys.has(moduleKey) ? "master" : "common"
}

export function buildDraft(definition: MasterDataModuleDefinition, record?: MasterDataRecord | null): MasterDataUpsertInput {
  const draft: MasterDataUpsertInput = {
    id: record?.id,
    uuid: record?.uuid,
    is_active: record ? isActive(record) : true,
  }

  for (const column of definition.columns) {
    draft[column.key] = column.type === "date" ? dateInputValue(record?.[column.key]) : record?.[column.key] ?? defaultValue(column)
  }

  return draft
}

export function validateDraft(definition: MasterDataModuleDefinition, draft: MasterDataUpsertInput) {
  for (const column of definition.columns) {
    if (!column.required) continue
    const value = draft[column.key]
    if (value === null || value === undefined || value === "") {
      return `${column.label} is required.`
    }
  }
  return null
}

export function isActive(record: MasterDataRecord) {
  return record.is_active === true || record.is_active === 1
}

export function formatValue(record: MasterDataRecord, column: MasterDataColumnDefinition) {
  const value = record[column.key]
  if (column.type === "boolean") return value ? "Yes" : "No"
  if (value === null || value === undefined || value === "") return "-"
  if (column.type === "date") return formatPlainDate(String(value))
  return String(value)
}

export function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"
}

export function searchRecords(records: MasterDataRecord[], searchValue: string) {
  const query = searchValue.trim().toLowerCase()
  if (!query) return records
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
}

function defaultValue(column: MasterDataColumnDefinition) {
  if (column.type === "boolean") return false
  if (column.type === "number") return ""
  return ""
}

function formatPlainDate(value: string) {
  const exactDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (exactDate) {
    const [, year, month, day] = exactDate
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date)
}

function dateInputValue(value: unknown) {
  if (value === null || value === undefined || value === "") return ""

  const rawValue = String(value)
  if (!rawValue.includes("T")) {
    return rawValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? rawValue
  }

  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
