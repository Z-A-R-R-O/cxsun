#!/usr/bin/env node

import { execSync, spawn } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const APP = process.argv[2] // 'server' | 'frontend'

if (!APP || !['server', 'frontend'].includes(APP)) {
  console.log('Usage: node preflight.mjs <server|frontend>')
  process.exit(1)
}

// ── Load .env ────────────────────────────────────────
function loadDotEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map(l => l.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(m => [m[1], m[2]]),
  )
}

// ── Port helpers ─────────────────────────────────────
function isPortInUse(p) {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr "\\<${p}\\>" | findstr LISTENING`
      : `lsof -i :${p} 2>/dev/null || ss -tlnp | grep ":${p} "`
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch { return false }
}

function getPidOnPort(p) {
  try {
    if (process.platform !== 'win32') return null
    const out = execSync(`netstat -ano | findstr "\\<${p}\\>" | findstr LISTENING`, { encoding: 'utf8' })
    const line = out.split('\n').find(Boolean)
    if (!line) return null
    return Number(line.trim().split(/\s+/).pop())
  } catch { return null }
}

function ask(query) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, (a) => { rl.close(); resolve(a) })
  })
}

// ── Main ─────────────────────────────────────────────
const env = loadDotEnv()
const defaults = { server: 6001, frontend: 6000 }
const envKey = APP === 'server' ? 'PORT' : 'VITE_PORT'
let port = Number(env[envKey]) || defaults[APP]

const launch = (finalPort) => {
  const cwd = resolve(ROOT, `apps/${APP}`)
  const cmd = APP === 'server'
    ? `tsx watch src/main.ts`
    : `vite`
  const child = spawn(cmd, [], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, [envKey]: String(finalPort) },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

if (isPortInUse(port)) {
  const pid = getPidOnPort(port)
  console.log(`\n  ⚠ Port ${port} is already in use${pid ? ` (PID ${pid})` : ''}`)

  // Auto-kill when non-TTY (pipelines, CI), otherwise prompt
  const isTTY = process.stdin.isTTY
  if (!isTTY) {
    console.log('  Non-interactive — attempting to kill existing process...')
  }

  const ans = isTTY ? await ask(`     (K)ill | (N)ext port | (A)bort [K/n/a]: `) : 'k'
  const c = ans.trim().toLowerCase() || 'k'

  if (c === 'k') {
    try {
      if (pid) {
        execSync(process.platform === 'win32'
          ? `taskkill /pid ${pid} /f`
          : `kill -9 ${pid}`, { stdio: 'pipe' })
        console.log(`  ✓ Killed PID ${pid}\n`)
      } else {
        console.log(`  ⚠ Could not detect PID. Use next port instead.\n`)
        while (isPortInUse(port)) port++
        console.log(`  ✓ Using port ${port}\n`)
      }
    } catch {
      console.log(`  ✗ Failed to kill. Use next port instead.\n`)
      while (isPortInUse(port)) port++
      console.log(`  ✓ Using port ${port}\n`)
    }
  } else if (c === 'n') {
    while (isPortInUse(port)) port++
    console.log(`  ✓ Using port ${port}\n`)
  } else {
    console.log('  Cancelled.\n')
    process.exit(1)
  }
}

launch(port)
