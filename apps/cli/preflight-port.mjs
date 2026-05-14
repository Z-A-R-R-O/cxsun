#!/usr/bin/env node

import { execSync } from 'child_process'
import { createInterface } from 'readline'

const port = Number(process.argv[2])
if (!port) {
  console.log('Usage: node preflight-port.mjs <port>')
  process.exit(1)
}

function ask(query) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, (a) => { rl.close(); resolve(a) })
  })
}

function isPortInUse(p) {
  try {
    const platform = process.platform
    if (platform === 'win32') {
      execSync(`netstat -ano | findstr "\\<${p}\\>"`, { stdio: 'pipe' })
    } else {
      execSync(`lsof -i :${p} 2>/dev/null || ss -tlnp | grep ":${p} "`, { stdio: 'pipe' })
    }
    return true
  } catch {
    return false
  }
}

function getPidOnPort(p) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr "\\<${p}\\>"`, { encoding: 'utf8' })
      const lines = out.trim().split('\n').filter(l => l.includes('LISTENING'))
      if (lines.length === 0) return null
      const parts = lines[0].trim().split(/\s+/)
      return Number(parts[parts.length - 1])
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  let finalPort = port

  if (isPortInUse(finalPort)) {
    console.log(`\n  ⚠ Port ${finalPort} is already in use.`)

    const pid = getPidOnPort(finalPort)
    if (pid) {
      console.log(`     PID: ${pid}`)
    }

    const answer = await ask(`     (K)ill existing process | (N)ext port | (A)bort [K/n/a]: `)
    const choice = answer.trim().toLowerCase() || 'k'

    if (choice === 'k' && pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${pid} /f`, { stdio: 'pipe' })
        } else {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' })
        }
        console.log(`  ✓ Killed PID ${pid}\n`)
      } catch {
        console.log(`  ✗ Failed to kill PID ${pid}\n`)
        process.exit(1)
      }
    } else if (choice === 'n') {
      while (isPortInUse(finalPort)) {
        finalPort++
      }
      console.log(`  ✓ Using port ${finalPort} instead\n`)
    } else {
      console.log('  Cancelled.\n')
      process.exit(1)
    }
  }

  process.stdout.write(String(finalPort))
}

await main()
