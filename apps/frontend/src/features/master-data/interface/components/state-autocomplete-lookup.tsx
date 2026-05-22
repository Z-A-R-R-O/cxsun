import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"

export interface StateAutocompleteLookupProps {
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  countryId?: unknown
  session: AuthSession
  value: unknown
}

export function StateAutocompleteLookup({
  className,
  disabled,
  label = "State",
  onChange,
  onOptionsChange,
  placeholder = "Search state name",
  countryId,
  session,
  value,
}: StateAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      className={className}
      createInput={buildStateCreateInput}
      createLabel="state"
      disabled={disabled}
      label={label}
      moduleKey="states"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      optionFilter={(record) => matchesReference(record.country_id, countryId)}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

export function stateLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "states")
}

export function buildStateLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getStateName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}

function buildStateCreateInput(name: string, records: MasterDataRecord[]): MasterDataUpsertInput {
  return {
    code: buildShortCode(name, records),
    country_id: 1,
    is_active: true,
    name,
  }
}

function buildShortCode(name: string, records: MasterDataRecord[]) {
  const existingCodes = new Set(records.map((record) => String(record.code ?? "").toUpperCase()))
  const normalizedWords = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  const initials = normalizedWords.length > 1 ? normalizedWords.map((word) => word[0]).join("") : ""
  const plain = normalizedWords.join("")
  const base = (initials || plain || "REC").slice(0, 6).padEnd(2, "X")

  if (!existingCodes.has(base)) return base

  for (let index = 2; index < 1000; index += 1) {
    const suffix = String(index)
    const candidate = `${base.slice(0, Math.max(1, 6 - suffix.length))}${suffix}`
    if (!existingCodes.has(candidate)) return candidate
  }

  return `${base.slice(0, 4)}${Date.now().toString(36).slice(-2).toUpperCase()}`
}
