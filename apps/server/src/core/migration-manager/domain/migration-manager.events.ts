import type { MigrationAction, MigrationTarget } from './migration-manager.types.js'

export interface MigrationManagerEvent {
  type: 'migration.started' | 'migration.completed' | 'migration.failed'
  action: MigrationAction
  target: MigrationTarget
  tenantSlug?: string
  message: string
  occurredAt: string
}

export function createMigrationEvent(
  type: MigrationManagerEvent['type'],
  data: Omit<MigrationManagerEvent, 'type' | 'occurredAt'>,
): MigrationManagerEvent {
  return {
    ...data,
    type,
    occurredAt: new Date().toISOString(),
  }
}
