export type MigrationTarget = 'master' | 'tenant' | 'all'

export type MigrationAction = 'migrate' | 'seed' | 'setup' | 'fresh'

export interface MigrationCommand {
  action: MigrationAction
  target: MigrationTarget
  tenantSlug?: string
}

export interface MigrationStepResult {
  step: string
  ok: boolean
  message: string
}

export interface MigrationRunResult {
  command: MigrationCommand
  ok: boolean
  results: MigrationStepResult[]
}
