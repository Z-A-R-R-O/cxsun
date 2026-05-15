#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const FRONTEND = resolve(ROOT, 'apps/frontend')
const env = { ...process.env, NODE_ENV: 'production' }

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: FRONTEND,
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(resolve(ROOT, 'node_modules/typescript/bin/tsc'), ['-b'])
run(resolve(ROOT, 'node_modules/vite/bin/vite.js'), ['build'])
