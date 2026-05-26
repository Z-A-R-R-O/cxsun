#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

const manager = process.env.CXSUN_RESTART_COMMAND

if (!manager) {
  if (existsSync('/.dockerenv')) {
    const delaySeconds = Number.parseInt(process.env.CXSUN_RESTART_DELAY_SECONDS ?? '5', 10)
    const safeDelaySeconds = Number.isFinite(delaySeconds) && delaySeconds >= 0 ? delaySeconds : 5
    const child = spawn('sh', ['-c', `sleep ${safeDelaySeconds}; kill -TERM 1`], {
      detached: true,
      stdio: 'ignore',
    })

    child.unref()
    console.log(`Docker restart scheduled in ${safeDelaySeconds} seconds.`)
    process.exit(0)
  }

  console.log(
    'No CXSUN_RESTART_COMMAND configured. Build completed; restart is managed by the active process runner.',
  )
  process.exit(0)
}

const { execSync } = await import('node:child_process')

execSync(manager, {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: true,
  stdio: 'inherit',
})
