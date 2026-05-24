import { execFile } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Injectable } from '../../decorators/injectable.js'
import { getBackendHealthUrl, getFrontendUrl } from '../../../framework/config/index.js'

const execFileAsync = promisify(execFile)

export interface SystemUpdateStep {
  name: string
  command?: string
  ok: boolean
  startedAt: string
  finishedAt: string
  output: string
}

export interface SystemUpdateResult {
  ok: boolean
  startedAt: string
  finishedAt: string
  repositoryRoot: string
  backendHealth: boolean
  frontendHealth: boolean
  steps: SystemUpdateStep[]
  error?: string
}

export interface SystemUpdatePreflight {
  ok: boolean
  repositoryRoot: string
  localVersion: string
  cloudVersion: string | null
  localCommit: string
  cloudCommit: string | null
  branch: string
  upstream: string | null
  dirty: boolean
  updateAvailable: boolean
  backendHealth: boolean
  frontendHealth: boolean
  checkedAt: string
  error?: string
}

@Injectable()
export class SystemUpdateService {
  private isRunning = false
  private lastResult: SystemUpdateResult | null = null
  private lastPreflight: SystemUpdatePreflight | null = null

  status() {
    return {
      running: this.isRunning,
      lastResult: this.lastResult,
      lastPreflight: this.lastPreflight,
    }
  }

  async preflight(): Promise<SystemUpdatePreflight> {
    const repositoryRoot = findWorkspaceRoot()
    const localVersion = readPackageVersion(repositoryRoot)
    const branch = await getBranch(repositoryRoot)
    const upstream = await getUpstream(repositoryRoot)
    const localCommit = await getLocalCommit(repositoryRoot)
    const dirty = await getDirty(repositoryRoot)

    try {
      await fetchRemoteMetadata(repositoryRoot)

      const cloudCommit = upstream
        ? await runText(repositoryRoot, 'git', ['rev-parse', upstream])
        : null
      const cloudVersion = upstream
        ? await readCloudPackageVersion(repositoryRoot, upstream)
        : await readGitHubPackageVersion()
      const result: SystemUpdatePreflight = {
        ok: true,
        repositoryRoot,
        localVersion,
        cloudVersion,
        localCommit,
        cloudCommit,
        branch,
        upstream,
        dirty,
        updateAvailable:
          Boolean(cloudCommit && cloudCommit !== localCommit) ||
          Boolean(cloudVersion && cloudVersion !== localVersion),
        backendHealth: await checkUrl(backendHealthUrl()),
        frontendHealth: await checkUrl(frontendUrl()),
        checkedAt: new Date().toISOString(),
      }

      this.lastPreflight = result
      return result
    } catch (error) {
      const result: SystemUpdatePreflight = {
        ok: false,
        repositoryRoot,
        localVersion,
        cloudVersion: await readGitHubPackageVersion(),
        localCommit,
        cloudCommit: null,
        branch,
        upstream,
        dirty,
        updateAvailable: false,
        backendHealth: await checkUrl(backendHealthUrl()),
        frontendHealth: await checkUrl(frontendUrl()),
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }

      this.lastPreflight = result
      return result
    }
  }

  async runUpdate(): Promise<SystemUpdateResult> {
    if (this.isRunning) {
      return {
        ok: false,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        repositoryRoot: findWorkspaceRoot(),
        backendHealth: false,
        frontendHealth: false,
        steps: [],
        error: 'System update is already running.',
      }
    }

    this.isRunning = true
    const startedAt = new Date().toISOString()
    const repositoryRoot = findWorkspaceRoot()
    const steps: SystemUpdateStep[] = []

    try {
      steps.push(await runStep(repositoryRoot, 'Force rollback tracked changes', 'git', ['reset', '--hard']))
      steps.push(await runStep(repositoryRoot, 'Pull latest changes', 'git', ['pull', '--ff-only']))
      steps.push(await runStep(repositoryRoot, 'Install dependencies', npmCommand(), ['ci']))
      steps.push(await runStep(repositoryRoot, 'Build active apps', npmCommand(), ['run', 'build:active']))
      steps.push(await runStep(repositoryRoot, 'Restart active app processes', npmCommand(), ['run', 'restart:active']))

      const backendHealth = await checkUrl(backendHealthUrl())
      const frontendHealth = await checkUrl(frontendUrl())
      const finishedAt = new Date().toISOString()
      const result: SystemUpdateResult = {
        ok: backendHealth && frontendHealth && steps.every((step) => step.ok),
        startedAt,
        finishedAt,
        repositoryRoot,
        backendHealth,
        frontendHealth,
        steps,
      }

      this.lastResult = result
      return result
    } catch (error) {
      const finishedAt = new Date().toISOString()
      const result: SystemUpdateResult = {
        ok: false,
        startedAt,
        finishedAt,
        repositoryRoot,
        backendHealth: await checkUrl(backendHealthUrl()),
        frontendHealth: await checkUrl(frontendUrl()),
        steps,
        error: error instanceof Error ? error.message : String(error),
      }

      this.lastResult = result
      return result
    } finally {
      this.isRunning = false
    }
  }
}

async function runText(cwd: string, command: string, args: string[]) {
  const result = await execFileAsync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
  })

  return result.stdout.trim()
}

async function fetchRemoteMetadata(repositoryRoot: string) {
  await execFileAsync('git', ['fetch', '--all', '--prune'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
  })
}

async function getBranch(repositoryRoot: string) {
  try {
    return await runText(repositoryRoot, 'git', ['branch', '--show-current'])
  } catch {
    return ''
  }
}

async function getUpstream(repositoryRoot: string) {
  try {
    return await runText(repositoryRoot, 'git', [
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{u}',
    ])
  } catch {
    return null
  }
}

async function getLocalCommit(repositoryRoot: string) {
  try {
    return await runText(repositoryRoot, 'git', ['rev-parse', 'HEAD'])
  } catch {
    return ''
  }
}

async function getDirty(repositoryRoot: string) {
  try {
    return Boolean(await runText(repositoryRoot, 'git', ['status', '--porcelain']))
  } catch {
    return false
  }
}

async function readCloudPackageVersion(repositoryRoot: string, upstream: string) {
  try {
    const packageJson = await runText(repositoryRoot, 'git', [
      'show',
      `${upstream}:package.json`,
    ])
    return (JSON.parse(packageJson) as { version?: string }).version ?? null
  } catch {
    return null
  }
}

async function readGitHubPackageVersion() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/CODEXSUN/cxsun/main/package.json',
      { signal: AbortSignal.timeout(10_000) },
    )

    if (!response.ok) {
      return null
    }

    return ((await response.json()) as { version?: string }).version ?? null
  } catch {
    return null
  }
}

function readPackageVersion(repositoryRoot: string) {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
    ) as { version?: string }

    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

async function runStep(
  cwd: string,
  name: string,
  command: string,
  args: string[],
): Promise<SystemUpdateStep> {
  const startedAt = new Date().toISOString()
  const commandLabel = [command, ...args].join(' ')

  try {
    const result = await execFileAsync(command, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    })

    return {
      name,
      command: commandLabel,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      output: trimOutput(`${result.stdout}\n${result.stderr}`),
    }
  } catch (error) {
    const execError = error as {
      stdout?: string
      stderr?: string
      message?: string
    }

    throw new Error(
      `${name} failed: ${trimOutput(`${execError.stdout ?? ''}\n${execError.stderr ?? execError.message ?? ''}`)}`,
    )
  }
}

async function checkUrl(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    return response.ok
  } catch {
    return false
  }
}

function backendHealthUrl() {
  return getBackendHealthUrl()
}

function frontendUrl() {
  return getFrontendUrl('127.0.0.1')
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function trimOutput(output: string) {
  return output.trim().slice(-12_000)
}

function findWorkspaceRoot() {
  const candidates = [
    process.cwd(),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'),
  ]

  for (const candidate of candidates) {
    const root = findRootFrom(candidate)
    if (root) {
      return root
    }
  }

  return process.cwd()
}

function findRootFrom(start: string) {
  let current = resolve(start)

  while (current !== dirname(current)) {
    const packagePath = resolve(current, 'package.json')

    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as {
        name?: string
        workspaces?: string[]
      }

      if (pkg.name === 'cxsun' && Array.isArray(pkg.workspaces)) {
        return current
      }
    }

    current = dirname(current)
  }

  return null
}
