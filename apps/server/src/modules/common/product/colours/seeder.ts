import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { coloursCommonDefinition } from './definition.js'

const coloursSeedRows = [
  { name: '-' },
  { name: 'Black' },
  { name: 'White' },
  { name: 'Blue' },
  { name: 'Navy' },
  { name: 'Red' },
  { name: 'Green' },
  { name: 'Yellow' },
  { name: 'Grey' },
  { name: 'Brown' },
  { name: 'Multi Colour' },
]

export function seedColoursCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, coloursCommonDefinition, coloursSeedRows)
}
