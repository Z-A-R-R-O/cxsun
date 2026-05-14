#!/usr/bin/env node

const manager = process.env.CXSUN_RESTART_COMMAND

if (!manager) {
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
