#!/usr/bin/env node

import { execFileSync, execSync } from 'child_process'
import { resolve } from 'path'
import { createInterface } from 'readline'
import { pathToFileURL } from 'url'
import {
  formatChangelogCommitSubject,
  readLatestVersionedChangelogEntry,
} from './changelog.mjs'

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

async function main() {
  const changelogEntry = readLatestVersionedChangelogEntry(ROOT)
  const defaultMessage = formatChangelogCommitSubject(changelogEntry)

  const status = run('git status --porcelain', { silent: true })
  const files = status ? status.split('\n').filter(Boolean) : []

  console.log(`\n  Changelog version: ${changelogEntry.version}`)
  console.log(`  Commit subject:    ${defaultMessage}`)
  console.log(`  Uncommitted:     ${files.length} files\n`)

  if (files.length > 0) {
    files.forEach((file) => console.log(`    ${file}`))
    console.log('')
  }

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`\n  Error: ${error.message}\n`)
    process.exit(1)
  })
}
