import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import {
  dropPlatformDatabase,
  migratePlatformDatabase,
  seedPlatformDatabase,
} from '../../../infrastructure/database/connection.js'
import { provisionTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { createMigrationEvent } from '../domain/migration-manager.events.js'
import type { MigrationCommand, MigrationRunResult, MigrationStepResult } from '../domain/migration-manager.types.js'
import { MigrationManagerEventBus } from './migration-manager-event-bus.js'
import { MigrationManagerRepository } from '../infrastructure/migration-manager.repository.js'

export class MigrationManagerService {
  constructor(
    private readonly repository = new MigrationManagerRepository(),
    private readonly eventBus = new MigrationManagerEventBus(),
    private readonly queue = new MasterQueueService(),
  ) {}

  async run(command: MigrationCommand): Promise<MigrationRunResult> {
    this.eventBus.publish(createMigrationEvent('migration.started', {
      action: command.action,
      target: command.target,
      tenantSlug: command.tenantSlug,
      message: 'Migration manager started.',
    }))

    const results: MigrationStepResult[] = []

    try {
      if (command.action === 'fresh') {
        await this.fresh(command, results)
      } else if (command.action === 'migrate') {
        await this.migrate(command, results)
      } else if (command.action === 'seed') {
        await this.seed(command, results)
      } else {
        await this.setup(command, results)
      }

      await this.enqueue(command)
      const ok = results.every((result) => result.ok)
      this.eventBus.publish(createMigrationEvent(ok ? 'migration.completed' : 'migration.failed', {
        action: command.action,
        target: command.target,
        tenantSlug: command.tenantSlug,
        message: ok ? 'Migration manager completed.' : 'Migration manager completed with failures.',
      }))

      return { command, ok, results }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Migration manager failed.'
      results.push({ step: 'migration-manager', ok: false, message })
      this.eventBus.publish(createMigrationEvent('migration.failed', {
        action: command.action,
        target: command.target,
        tenantSlug: command.tenantSlug,
        message,
      }))
      return { command, ok: false, results }
    }
  }

  events() {
    return this.eventBus.recent()
  }

  private async fresh(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await dropPlatformDatabase()
      results.push({ step: 'master.drop', ok: true, message: 'Master MariaDB database recreated.' })
      await migratePlatformDatabase()
      results.push({ step: 'master.migrate', ok: true, message: 'Platform migrations completed.' })
      await seedPlatformDatabase()
      results.push({ step: 'master.seed', ok: true, message: 'Platform seeds completed.' })
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.dropTenant(command, results)
      await this.provisionTenant(command, results)
    }
  }

  private async setup(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await migratePlatformDatabase()
      results.push({ step: 'master.migrate', ok: true, message: 'Platform migrations completed.' })
      await seedPlatformDatabase()
      results.push({ step: 'master.seed', ok: true, message: 'Platform seeds completed.' })
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async migrate(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await migratePlatformDatabase()
      results.push({ step: 'master.migrate', ok: true, message: 'Platform migrations completed.' })
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async seed(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await seedPlatformDatabase()
      results.push({ step: 'master.seed', ok: true, message: 'Platform seeds completed.' })
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async dropTenant(command: MigrationCommand, results: MigrationStepResult[]) {
    const tenants = await this.targetTenants(command)

    for (const tenant of tenants) {
      await this.repository.dropTenantDatabase(tenant)
      results.push({ step: `tenant.${tenant.slug}.drop`, ok: true, message: `${tenant.db_name} dropped.` })
    }
  }

  private async provisionTenant(command: MigrationCommand, results: MigrationStepResult[]) {
    const tenants = await this.targetTenants(command)

    for (const tenant of tenants) {
      await provisionTenantDatabase(tenant)
      results.push({ step: `tenant.${tenant.slug}.setup`, ok: true, message: `${tenant.db_name} migrated and seeded.` })
    }
  }

  private async targetTenants(command: MigrationCommand) {
    await migratePlatformDatabase()

    if (command.tenantSlug) {
      const tenant = await this.repository.findTenant(command.tenantSlug)
      if (!tenant) {
        throw new Error(`Tenant "${command.tenantSlug}" was not found. Run master setup first, or use an existing tenant slug.`)
      }
      return [tenant]
    }

    return this.repository.listTenants()
  }

  private async enqueue(command: MigrationCommand) {
    await migratePlatformDatabase()
    await this.queue.enqueue({ type: 'database.migration', payload: { ...command } })
  }
}
