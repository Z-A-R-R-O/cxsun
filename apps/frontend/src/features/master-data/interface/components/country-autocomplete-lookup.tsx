import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"

export interface CountryAutocompleteLookupProps {
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  session: AuthSession
  value: unknown
}

export function CountryAutocompleteLookup({
  className,
  disabled,
  label = "Country",
  onChange,
  onOptionsChange,
  placeholder = "Search country name",
  session,
  value,
}: CountryAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      className={className}
      createInput={buildCountryCreateInput}
      createLabel="country"
      disabled={disabled}
      label={label}
      moduleKey="countries"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

export function countryLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "countries")
}

export function buildCountryLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getCountryName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}

function buildCountryCreateInput(name: string, records: MasterDataRecord[]): MasterDataUpsertInput {
  const existingCodes = new Set(records.map((record) => String(record.code ?? "").toUpperCase()))

  return {
    code: buildCountryCode(name, existingCodes),
    is_active: true,
    name,
    phone_code: "",
  }
}

function buildCountryCode(name: string, existingCodes: ReadonlySet<string>) {
  const normalizedWords = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

  const wordInitials = normalizedWords.length > 1 ? normalizedWords.map((word) => word[0]).join("") : ""
  const plain = normalizedWords.join("")
  const base = (wordInitials || plain || "CTY").slice(0, 6).padEnd(2, "X")

  if (!existingCodes.has(base)) return base

  for (let index = 2; index < 1000; index += 1) {
    const suffix = String(index)
    const candidate = `${base.slice(0, Math.max(1, 6 - suffix.length))}${suffix}`
    if (!existingCodes.has(candidate)) return candidate
  }

  return `${base.slice(0, 4)}${Date.now().toString(36).slice(-2).toUpperCase()}`
}
