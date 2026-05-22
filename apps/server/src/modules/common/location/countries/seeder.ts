import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { countriesCommonDefinition } from './definition.js'

const countriesSeedRows = [
  { code: 'IN', name: 'India', phone_code: '+91' },
  { code: 'US', name: 'United States', phone_code: '+1' },
  { code: 'GB', name: 'United Kingdom', phone_code: '+44' },
  { code: 'SG', name: 'Singapore', phone_code: '+65' },
  { code: 'AE', name: 'United Arab Emirates', phone_code: '+971' },
  { code: 'CA', name: 'Canada', phone_code: '+1' },
  { code: 'AU', name: 'Australia', phone_code: '+61' },
  { code: 'MY', name: 'Malaysia', phone_code: '+60' },
  { code: 'SA', name: 'Saudi Arabia', phone_code: '+966' },
  { code: 'DE', name: 'Germany', phone_code: '+49' },
]

export function seedCountriesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, countriesCommonDefinition, countriesSeedRows)
}
