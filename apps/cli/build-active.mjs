#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')

function formatDuration(ms) {
  if (ms < 1_000) return `${Math.round(ms)}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

function run(label, command, args) {
  const startedAt = performance.now()
  console.log(`\n[build] ${label} started`)

  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  const duration = formatDuration(performance.now() - startedAt)

  if (result.status !== 0) {
    console.error(`[build] ${label} failed after ${duration}`)
    process.exit(result.status ?? 1)
  }

  console.log(`[build] ${label} completed in ${duration}`)
}

function runNpm(label, args) {
  if (process.platform === 'win32') {
    run(label, 'cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')])
    return
  }

  run(label, 'npm', args)
}

const totalStartedAt = performance.now()

runNpm('Backend server build', ['-w', 'apps/server', 'run', 'build'])
runNpm('Frontend app build', ['-w', 'apps/frontend', 'run', 'build'])

console.log(`\n[build] Active build completed in ${formatDuration(performance.now() - totalStartedAt)}`)
