import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'

export type TenantDatabase = Kysely<TenantDatabaseSchema>

