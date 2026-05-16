import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { statesCommonDefinition } from '../../domain/value-objects/states.definition.js'

const statesSeedRows = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: '-', name: '-' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'PY', name: 'Puducherry' },
]

function countryId(code: string) {
  const countries = [
    { code: 'IN' }, { code: 'US' }, { code: 'GB' }, { code: 'SG' }, { code: 'AE' },
    { code: 'CA' }, { code: 'AU' }, { code: 'DE' }, { code: 'FR' }, { code: 'IT' },
    { code: 'NL' }, { code: 'CH' }, { code: 'JP' }, { code: 'CN' }, { code: 'KR' },
    { code: 'MY' }, { code: 'TH' }, { code: 'ID' }, { code: 'PH' }, { code: 'SA' },
    { code: 'QA' }, { code: 'KW' }, { code: 'OM' }, { code: 'ZA' }, { code: 'BR' },
  ]
  return countries.findIndex((c) => c.code === code) + 1
}

export function seedStatesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(
    database,
    statesCommonDefinition,
    statesSeedRows.map((row) => ({
      country_id: countryId('IN'),
      ...row,
    })),
  )
}
