#!/usr/bin/env node

import { execFileSync, execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

const ROOT = resolve(import.meta.dirname, '../..')

function run(cmd, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio,
    ...opts,
  })
  return result ? result.trim() : ''
}

function runGit(args, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio,
    ...opts,
  })
  return result ? result.trim() : ''
}

let cachedPipedAnswers

async function pipedAnswers() {
  if (cachedPipedAnswers) {
    return cachedPipedAnswers
  }

  if (process.stdin.isTTY) {
    cachedPipedAnswers = []
    return cachedPipedAnswers
  }

  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  cachedPipedAnswers = Buffer.concat(chunks).toString().trim().split('\n')
  return cachedPipedAnswers
}

async function ask(query) {
  process.stdout.write(query)

  const answers = await pipedAnswers()
  if (answers.length > 0) {
    return answers.shift()
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolveAnswer) => {
    rl.question('', (answer) => {
      rl.close()
      resolveAnswer(answer)
    })
  })
}

function getChangelogTitle() {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  const text = readFileSync(path, 'utf8')
  const match = text.match(/^### (?:\[v [\d.]+\] )?\d{4}-\d{2}-\d{2} - (.+)$/m)
  return match ? match[1].trim() : 'update'
}

async function main() {
  const prevTitle = getChangelogTitle()

  const status = run('git status --porcelain', { silent: true })
  const files = status ? status.split('\n').filter(Boolean) : []

  console.log(`\n  Changelog title: ${prevTitle}`)
  console.log(`  Uncommitted:     ${files.length} files\n`)

  if (files.length > 0) {
    files.forEach((file) => console.log(`    ${file}`))
    console.log('')
  }

  const defaultMessage = prevTitle
  const messageAnswer = await ask(`  Commit message [${defaultMessage}]: `)
  const message = messageAnswer.trim() || defaultMessage

  console.log('\n  > git pull --rebase --autostash')
  runGit(['pull', '--rebase', '--autostash'])
  console.log('')

  console.log('  > git add -A')
  runGit(['add', '-A'])

  console.log(`  > git commit -m "${message}"`)
  runGit(['commit', '-m', message])

  console.log('  > git push')
  runGit(['push'])

  console.log(`\n  Done - ${message}\n`)
}

main().catch((error) => {
  console.error(`\n  Error: ${error.message}\n`)
  process.exit(1)
})
