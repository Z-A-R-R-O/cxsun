#!/usr/bin/env node

import { MigrationManagerService } from './application/migration-manager.service.js'
import type { MigrationAction, MigrationCommand, MigrationTarget } from './domain/migration-manager.types.js'

const command = parseCommand(process.argv.slice(2))
const manager = new MigrationManagerService()
const result = await manager.run(command)

for (const step of result.results) {
  const marker = step.ok ? 'ok' : 'fail'
  console.log(`[${marker}] ${step.step}: ${step.message}`)
}

process.exit(result.ok ? 0 : 1)

function parseCommand(args: string[]): MigrationCommand {
  const action = normalizeAction(args[0])
  const target = parseTarget(args)
  const tenantSlug = parseTenant(args)

  if (tenantSlug) {
    return { action, target: 'tenant', tenantSlug }
  }

  return { action, target }
}

function normalizeAction(value?: string): MigrationAction {
  if (value === 'fresh' || value === 'migrate' || value === 'seed' || value === 'setup') {
    return value
  }

  return 'setup'
}

function parseTarget(args: string[]): MigrationTarget {
  const targetArg = args.find((arg) => arg.startsWith('--target=') || arg.startsWith('-target='))
  const explicitTarget = targetArg?.split('=').slice(1).join('=').trim().toLowerCase()
  if (explicitTarget === 'master' || explicitTarget === 'tenant' || explicitTarget === 'all') return explicitTarget
  if (args.some((arg) => arg === '--master' || arg === '-master')) return 'master'
  if (args.some((arg) => arg === '--tenant' || arg === '-tenant' || arg.startsWith('--tenant=') || arg.startsWith('-tenant='))) return 'tenant'
  if (args.some((arg) => arg === '--all' || arg === '-all')) return 'all'
  return 'all'
}

function parseTenant(args: string[]) {
  const tenantArg = args.find((arg) => arg.startsWith('--tenant=') || arg.startsWith('-tenant='))
  if (tenantArg) {
    return tenantArg.split('=').slice(1).join('=').trim().toLowerCase()
  }

  const tenantIndex = args.findIndex((arg) => arg === '--tenant' || arg === '-tenant')
  if (tenantIndex >= 0) {
    return args[tenantIndex + 1]?.trim().toLowerCase()
  }

  return undefined
}
