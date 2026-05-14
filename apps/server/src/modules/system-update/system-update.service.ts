import { execFile } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Injectable } from '../../core/decorators/injectable.js'

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

@Injectable()
export class SystemUpdateService {
  private isRunning = false
  private lastResult: SystemUpdateResult | null = null

  status() {
    return {
      running: this.isRunning,
      lastResult: this.lastResult,
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
      steps.push(await runStep(repositoryRoot, 'Remove untracked files', 'git', ['clean', '-fd']))
      steps.push(await runStep(repositoryRoot, 'Pull latest changes', 'git', ['pull', '--ff-only']))
      steps.push(await runStep(repositoryRoot, 'Install dependencies', npmCommand(), ['ci']))
      steps.push(await runStep(repositoryRoot, 'Build active apps', npmCommand(), ['run', 'build:active']))

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
  const port = process.env.PORT ?? '6001'
  return process.env.BACKEND_HEALTH_URL ?? `http://127.0.0.1:${port}/health`
}

function frontendUrl() {
  const port = process.env.VITE_PORT ?? '6010'
  return process.env.FRONTEND_URL ?? process.env.ELECTRON_DEV_SERVER_URL ?? `http://127.0.0.1:${port}`
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
