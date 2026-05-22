import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"

export interface DistrictAutocompleteLookupProps {
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  session: AuthSession
  stateId?: unknown
  value: unknown
}

export function DistrictAutocompleteLookup({
  className,
  disabled,
  label = "District",
  onChange,
  onOptionsChange,
  placeholder = "Search district name",
  session,
  stateId,
  value,
}: DistrictAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      className={className}
      createInput={buildDistrictCreateInput}
      createLabel="district"
      disabled={disabled}
      label={label}
      moduleKey="districts"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      optionFilter={(record) => matchesReference(record.state_id, stateId)}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

export function districtLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "districts")
}

export function buildDistrictLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getDistrictName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}

function buildDistrictCreateInput(name: string): MasterDataUpsertInput {
  return {
    is_active: true,
    name,
    state_id: 1,
  }
}
