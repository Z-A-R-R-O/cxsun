import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { productMasterDefinition } from '../../domain/value-objects/product-master.definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

const productSeedRows = [
  { code: '-', name: '-', description: '-' },
  {
    brand_id: 1,
    code: 'TSHIRT-COTTON',
    colour_id: 1,
    description: 'Cotton T-shirt product template with common master references.',
    hsn_code_id: 6,
    name: 'Cotton T-shirt',
    product_category_id: 1,
    product_group_id: 1,
    product_type_id: 1,
    size_id: 1,
    style_id: 1,
    tax_id: 4,
    unit_id: 2,
  },
]

export function seedProductMasterTable(database: TenantDatabase) {
  return seedMasterRecordDefinition(database, productMasterDefinition, productSeedRows)
}
