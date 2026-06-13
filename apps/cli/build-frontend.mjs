#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const FRONTEND = resolve(ROOT, 'apps/frontend')
const env = { ...process.env, NODE_ENV: 'production' }

function formatDuration(ms) {
  if (ms < 1_000) return `${Math.round(ms)}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

function run(label, script, args) {
  const startedAt = performance.now()
  console.log(`\n[frontend] ${label} started`)

  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: FRONTEND,
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  const duration = formatDuration(performance.now() - startedAt)

  if (result.status !== 0) {
    console.error(`[frontend] ${label} failed after ${duration}`)
    process.exit(result.status ?? 1)
  }

  console.log(`[frontend] ${label} completed in ${duration}`)
}

run('TypeScript project build', resolve(ROOT, 'node_modules/typescript/bin/tsc'), ['-b'])
run('Vite production bundle', resolve(ROOT, 'node_modules/vite/bin/vite.js'), ['build'])
