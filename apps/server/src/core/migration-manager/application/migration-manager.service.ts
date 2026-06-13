import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import {
  dropPlatformDatabase,
  migratePlatformDatabase,
  seedPlatformDatabase,
} from '../../../infrastructure/database/connection.js'
import { createMigrationEvent } from '../domain/migration-manager.events.js'
import type { MigrationCommand, MigrationRunResult, MigrationStepResult } from '../domain/migration-manager.types.js'
import { MigrationManagerEventBus } from './migration-manager-event-bus.js'
import { MigrationManagerRepository } from '../infrastructure/migration-manager.repository.js'

const DEFAULT_TENANT_PROVISION_TIMEOUT_MS = 30_000

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
      await this.runStep(results, 'master.drop', 'Master MariaDB database recreated.', () => dropPlatformDatabase())
      await this.runStep(results, 'master.migrate', 'Platform migrations completed.', () => migratePlatformDatabase())
      await this.runStep(results, 'master.seed', 'Platform seeds completed.', () => seedPlatformDatabase())
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.dropTenant(command, results)
      await this.provisionTenant(command, results)
    }
  }

  private async setup(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await this.runStep(results, 'master.migrate', 'Platform migrations completed.', () => migratePlatformDatabase())
      await this.runStep(results, 'master.seed', 'Platform seeds completed.', () => seedPlatformDatabase())
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async migrate(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await this.runStep(results, 'master.migrate', 'Platform migrations completed.', () => migratePlatformDatabase())
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async seed(command: MigrationCommand, results: MigrationStepResult[]) {
    if (command.target === 'master' || command.target === 'all') {
      await this.runStep(results, 'master.seed', 'Platform seeds completed.', () => seedPlatformDatabase())
    }

    if (command.target === 'tenant' || command.target === 'all') {
      await this.provisionTenant(command, results)
    }
  }

  private async dropTenant(command: MigrationCommand, results: MigrationStepResult[]) {
    const tenants = await this.targetTenants(command)

    for (const tenant of tenants) {
      await this.runStep(results, `tenant.${tenant.slug}.drop`, `${tenant.db_name} dropped.`, () =>
        this.repository.dropTenantDatabase(tenant),
      )
    }
  }

  private async provisionTenant(command: MigrationCommand, results: MigrationStepResult[]) {
    const tenants = await this.targetTenants(command)
    const timeoutMs = tenantProvisionTimeoutMs()

    for (const tenant of tenants) {
      await this.runStep(results, `tenant.${tenant.slug}.setup`, `${tenant.db_name} migrated and seeded.`, async () => {
        const { provisionTenantDatabase } = await import('../../../infrastructure/tenant-database/tenant-database.connection.js')
        await withTimeout(
          provisionTenantDatabase(tenant),
          timeoutMs,
          `Tenant "${tenant.slug}" database provisioning timed out after ${timeoutMs}ms.`,
        )
      })
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
    console.log('[db:setup] START migration.enqueue')
    await migratePlatformDatabase()
    await this.queue.enqueue({ type: 'database.migration', payload: { ...command } })
    console.log('[db:setup] DONE migration.enqueue')
  }

  private async runStep(
    results: MigrationStepResult[],
    step: string,
    successMessage: string,
    task: () => Promise<unknown>,
  ) {
    console.log(`[db:setup] START ${step}`)
    const startedAt = Date.now()

    try {
      await task()
      const duration = Math.round((Date.now() - startedAt) / 1000)
      console.log(`[db:setup] DONE ${step} (${duration}s)`)
      results.push({ step, ok: true, message: successMessage })
    } catch (error) {
      const message = error instanceof Error ? error.message : `${step} failed.`
      const duration = Math.round((Date.now() - startedAt) / 1000)
      console.error(`[db:setup] FAIL ${step} (${duration}s): ${message}`)
      results.push({ step, ok: false, message })
      throw error
    }
  }
}

function tenantProvisionTimeoutMs() {
  const configured = Number.parseInt(process.env.TENANT_PROVISION_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TENANT_PROVISION_TIMEOUT_MS
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}
