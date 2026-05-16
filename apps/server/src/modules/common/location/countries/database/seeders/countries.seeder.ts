import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { countriesCommonDefinition } from '../../domain/value-objects/countries.definition.js'

const countriesSeedRows = [
  { code: 'IN', name: 'India', phone_code: '+91' },
  { code: 'US', name: 'United States', phone_code: '+1' },
  { code: 'GB', name: 'United Kingdom', phone_code: '+44' },
  { code: 'SG', name: 'Singapore', phone_code: '+65' },
  { code: 'AE', name: 'United Arab Emirates', phone_code: '+971' },
  { code: 'CA', name: 'Canada', phone_code: '+1' },
  { code: 'AU', name: 'Australia', phone_code: '+61' },
  { code: 'DE', name: 'Germany', phone_code: '+49' },
  { code: 'FR', name: 'France', phone_code: '+33' },
  { code: 'IT', name: 'Italy', phone_code: '+39' },
  { code: 'NL', name: 'Netherlands', phone_code: '+31' },
  { code: 'CH', name: 'Switzerland', phone_code: '+41' },
  { code: 'JP', name: 'Japan', phone_code: '+81' },
  { code: 'CN', name: 'China', phone_code: '+86' },
  { code: 'KR', name: 'South Korea', phone_code: '+82' },
  { code: 'MY', name: 'Malaysia', phone_code: '+60' },
  { code: 'TH', name: 'Thailand', phone_code: '+66' },
  { code: 'ID', name: 'Indonesia', phone_code: '+62' },
  { code: 'PH', name: 'Philippines', phone_code: '+63' },
  { code: 'SA', name: 'Saudi Arabia', phone_code: '+966' },
  { code: 'QA', name: 'Qatar', phone_code: '+974' },
  { code: 'KW', name: 'Kuwait', phone_code: '+965' },
  { code: 'OM', name: 'Oman', phone_code: '+968' },
  { code: 'ZA', name: 'South Africa', phone_code: '+27' },
  { code: 'BR', name: 'Brazil', phone_code: '+55' },
]

export function seedCountriesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, countriesCommonDefinition, countriesSeedRows)
}
