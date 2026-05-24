import type { MasterDataRecord } from "src/features/master-data/domain/master-data"

export type StockContactRole = "customer" | "supplier"

const sharedContactTypeTokens = new Set([
  "vendorcustomer",
  "customerandsupplier",
  "customersupplier",
  "suppliercustomer",
  "vendorandcustomer",
])

const contactRoleTokens: Record<StockContactRole, Set<string>> = {
  customer: new Set(["customer", "sundrydebitor", "sundrydebitors", ...sharedContactTypeTokens]),
  supplier: new Set(["supplier", "vendor", "sundrycreditor", "sundrycreditors", ...sharedContactTypeTokens]),
}

export function filterStockContactsByRole(records: MasterDataRecord[], contactTypes: MasterDataRecord[], role: StockContactRole) {
  const allowedTokens = contactRoleTokens[role]
  const contactTypeNames = new Map<string, string>()

  for (const contactType of contactTypes) {
    const name = readRecordString(contactType.name)
    for (const id of [contactType.uuid, contactType.id, contactType.code]) {
      const key = readRecordString(id)
      if (key) contactTypeNames.set(key, name)
    }
  }

  return records.filter((record) => {
    const contactTypeId = readRecordString(record.contactTypeId ?? record.contact_type_id)
    const tokens = [
      contactTypeId,
      contactTypeNames.get(contactTypeId),
      record.contactTypeName,
      record.contact_type_name,
      record.ledgerId,
      record.ledger_id,
      record.ledgerName,
      record.ledger_name,
    ].map(normalizeContactTypeToken)

    return tokens.some((token) => token && allowedTokens.has(token))
  })
}

export function stockContactTypeId(contactTypes: MasterDataRecord[], role: StockContactRole) {
  const preferredTokens = role === "supplier" ? ["supplier"] : ["customer"]
  const sharedTokens = ["vendorcustomer", "customerandsupplier", "customersupplier"]
  const records = [...contactTypes].sort((left, right) => preferredSort(left, preferredTokens, sharedTokens) - preferredSort(right, preferredTokens, sharedTokens))
  const record = records.find((contactType) => {
    const token = normalizeContactTypeToken(contactType.name)
    return preferredTokens.includes(token) || sharedTokens.includes(token)
  })

  return record ? String(record.uuid ?? record.id) : role === "supplier" ? "contact-type:supplier" : "contact-type:customer"
}

function preferredSort(record: MasterDataRecord, preferredTokens: string[], sharedTokens: string[]) {
  const token = normalizeContactTypeToken(record.name)
  if (preferredTokens.includes(token)) return 0
  if (sharedTokens.includes(token)) return 1
  return 2
}

function normalizeContactTypeToken(value: unknown) {
  return readRecordString(value).toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function readRecordString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}
