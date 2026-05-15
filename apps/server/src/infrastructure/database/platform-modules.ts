import { authDatabaseModule } from '../../modules/auth/infrastructure/auth.database.js'
import { clientDatabaseModule } from '../../modules/client/infrastructure/client.database.js'
import { industryDatabaseModule } from '../../modules/industry/infrastructure/industry.database.js'
import { siteDatabaseModule } from '../../modules/site/site.database.js'
import { tenantDatabaseModule } from '../../modules/tenant/infrastructure/tenant.database.js'
import { tenantDomainDatabaseModule } from '../../modules/tenant-domain/infrastructure/tenant-domain.database.js'
import { queueDatabaseModule } from '../queue/queue.database.js'
import type { PlatformDatabaseModule } from './database-module.js'

export const platformDatabaseModules: PlatformDatabaseModule[] = [
  siteDatabaseModule,
  industryDatabaseModule,
  tenantDatabaseModule,
  tenantDomainDatabaseModule,
  clientDatabaseModule,
  authDatabaseModule,
  queueDatabaseModule,
]
