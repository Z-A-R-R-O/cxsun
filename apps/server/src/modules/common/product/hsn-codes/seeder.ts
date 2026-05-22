import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { hsnCodesCommonDefinition } from './definition.js'

const hsnCodesSeedRows = [
  { code: '00000000', description: '-' },
  { code: '60062200', description: 'Knitted dyed cotton fabrics' },
  { code: '60063200', description: 'Knitted dyed synthetic fabrics' },
  { code: '60064200', description: 'Knitted dyed artificial fibre fabrics' },
  { code: '60069000', description: 'Hosiery fabrics and other knitted fabrics' },
  { code: '61091000', description: 'Cotton T-shirts and vests' },
  { code: '61099090', description: 'T-shirts and vests of other textile materials' },
  { code: '62034200', description: 'Mens and boys cotton trousers' },
  { code: '62046200', description: 'Womens and girls cotton trousers' },
  { code: '62044390', description: 'Womens synthetic fibre dresses' },
  { code: '62044990', description: 'Womens dresses of other textile materials' },
  { code: '62171090', description: 'Garment accessories and made-up clothing aids' },
  { code: '58071090', description: 'Textile labels, badges, and similar garment aids' },
]

export function seedHsnCodesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, hsnCodesCommonDefinition, hsnCodesSeedRows)
}
