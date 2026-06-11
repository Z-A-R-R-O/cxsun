import { authDatabaseModule } from '../../modules/auth/infrastructure/auth.database.js'
import { industryDatabaseModule } from '../../core/industry/infrastructure/industry.database.js'
import { siteDatabaseModule } from '../../modules/site/site.database.js'
import { tenantDatabaseModule } from '../../core/tenant/infrastructure/tenant.database.js'
import { tenantDomainDatabaseModule } from '../../core/tenant-domain/infrastructure/tenant-domain.database.js'
import { queueDatabaseModule } from '../queue/queue.database.js'
import { gstPlatformDatabaseModule } from '../../modules/gst/gst-compliance/database/gst-platform.migration.js'
import { agentOsDatabaseModule } from '../../modules/agent-os/index.js'
import type { PlatformDatabaseModule } from './database-module.js'

export const platformDatabaseModules: PlatformDatabaseModule[] = [
  siteDatabaseModule,
  industryDatabaseModule,
  tenantDatabaseModule,
  tenantDomainDatabaseModule,
  authDatabaseModule,
  queueDatabaseModule,
  gstPlatformDatabaseModule,
  agentOsDatabaseModule,
]
