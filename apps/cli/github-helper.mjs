#!/usr/bin/env node

import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')

function run(cmd, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execSync(cmd, { encoding: 'utf8', cwd: ROOT, stdio, ...opts })
  return result ? result.trim() : ''
}

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function getChangelogData() {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  const text = readFileSync(path, 'utf8')

  const versionMatch = text.match(/## v-([\d.]+)/)
  const titleMatch = text.match(
    /### \[v [\d.]+\] \d{4}-\d{2}-\d{2} - (.+)/,
  )
  const version = versionMatch ? versionMatch[1] : '0.0.00'
  const title = titleMatch ? titleMatch[1] : 'update'

  return { version, title, ref: version.split('.')[2] || '0' }
}

function getUncommittedFiles() {
  const status = run('git status --porcelain', { silent: true })
  if (!status) return []
  return status.split('\n').filter(Boolean)
}

async function main() {
  const { version, title, ref } = getChangelogData()
  const files = getUncommittedFiles()

  console.log(`\n  Version: ${version}`)
  console.log(`  Latest:  ${title}`)
  console.log(`  Files:   ${files.length} uncommitted\n`)

  if (files.length > 0) {
    files.forEach((f) => console.log(`    ${f}`))
    console.log('')
  }

  const defaultMsg =
    files.length > 0
      ? `#${ref} v${version} ${title}`
      : `#${ref} v${version} ${title} (no code changes)`

  const answer = await ask(
    `  Commit message [${defaultMsg}]: `,
  )
  const msg = answer.trim() || defaultMsg

  console.log('')

  if (files.length === 0) {
    console.log('  Nothing to commit.')
    return
  }

  try {
    console.log('  » git pull --rebase')
    run('git pull --rebase')
    console.log('')
  } catch {
    console.log('  ⚠ pull skipped (will push anyway)\n')
  }

  console.log('  » git add -A')
  run('git add -A')

  console.log(`  » git commit -m "${msg}"`)
  run(`git commit -m "${msg.replace(/"/g, '\\"')}"`)

  console.log('  » git push')
  run('git push')

  console.log(`\n  ✓ Done — ${msg}\n`)
}

main().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
