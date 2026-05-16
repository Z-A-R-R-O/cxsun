import { authDatabaseModule } from '../../modules/auth/infrastructure/auth.database.js'
import { clientDatabaseModule } from '../../modules/crm/client/infrastructure/client.database.js'
import { industryDatabaseModule } from '../../core/industry/infrastructure/industry.database.js'
import { siteDatabaseModule } from '../../modules/site/site.database.js'
import { tenantDatabaseModule } from '../../core/tenant/infrastructure/tenant.database.js'
import { tenantDomainDatabaseModule } from '../../core/tenant-domain/infrastructure/tenant-domain.database.js'
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
