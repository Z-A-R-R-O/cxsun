import { execFile, spawn } from 'child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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
  required: boolean
  startedAt: string
  finishedAt: string
  output: string
}

export interface SystemUpdateResult {
  ok: boolean
  phase: 'idle' | 'updating' | 'rollback' | 'completed' | 'failed'
  startedAt: string
  finishedAt: string
  repositoryRoot: string
  runId: string
  backupId?: string
  backupPath?: string
  previousCommit?: string
  targetCommit?: string | null
  lastCommand?: string
  logPath?: string
  recoveryAction?: string
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

export interface SystemUpdateStatus {
  running: boolean
  lastResult: SystemUpdateResult | null
  lastPreflight: SystemUpdatePreflight | null
}

@Injectable()
export class SystemUpdateService {
  private isRunning = false
  private lastResult: SystemUpdateResult | null = readPersistedUpdateResult()
  private lastPreflight: SystemUpdatePreflight | null = null

  status(): SystemUpdateStatus {
    if (
      !this.isRunning &&
      this.lastResult?.phase === 'updating' &&
      !this.lastResult.runId.startsWith('script-')
    ) {
      this.lastResult = {
        ...this.lastResult,
        ok: false,
        phase: 'failed',
        finishedAt: new Date().toISOString(),
        error: this.lastResult.error ?? 'Update status was recovered after process restart before completion.',
        recoveryAction: this.lastResult.recoveryAction ?? recoveryAction(this.lastResult),
      }
      persistUpdateResult(this.lastResult)
    }

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

  startUpdate(): SystemUpdateStatus & { accepted: boolean; message: string } {
    if (this.isRunning) {
      return {
        ...this.status(),
        accepted: false,
        message: 'System update is already running.',
      }
    }

    void this.runUpdate()

    return {
      ...this.status(),
      accepted: true,
      message: 'System update started. Progress is available from status.',
    }
  }

  startUpdateScript(): SystemUpdateStatus & { accepted: boolean; message: string } {
    if (this.isRunning) {
      return {
        ...this.status(),
        accepted: false,
        message: 'System update is already running.',
      }
    }

    this.startDetachedUpdateScript()

    return {
      ...this.status(),
      accepted: true,
      message: 'update.sh started as a detached recovery process. The app may disconnect while it stops and restarts.',
    }
  }

  startRollback(): SystemUpdateStatus & { accepted: boolean; message: string } {
    if (this.isRunning) {
      return {
        ...this.status(),
        accepted: false,
        message: 'System update or rollback is already running.',
      }
    }

    const previous = this.lastResult
    if (!previous?.backupId || !previous.previousCommit) {
      return {
        ...this.status(),
        accepted: false,
        message: 'Rollback needs both a database backup ID and previous Git commit.',
      }
    }

    void this.runRollback(previous.backupId, previous.previousCommit)

    return {
      ...this.status(),
      accepted: true,
      message: `Rollback started for backup ${previous.backupId} and commit ${previous.previousCommit.slice(0, 12)}.`,
    }
  }

  private async runUpdate(): Promise<void> {
    this.isRunning = true
    const startedAt = new Date().toISOString()
    const runId = timestampId()
    const repositoryRoot = findWorkspaceRoot()
    const logPath = updateLogPath(repositoryRoot, runId)
    const steps: SystemUpdateStep[] = []
    const previousCommit = await getLocalCommit(repositoryRoot)
    const upstream = await getUpstream(repositoryRoot)
    let backupId: string | undefined
    let backupPath: string | undefined
    let targetCommit: string | null = null

    this.lastResult = {
      ok: false,
      phase: 'updating',
      startedAt,
      finishedAt: startedAt,
      repositoryRoot,
      runId,
      previousCommit,
      targetCommit,
      logPath,
      backendHealth: false,
      frontendHealth: false,
      steps,
      recoveryAction: 'Rollback will be available after the database backup step completes.',
    }
    persistUpdateResult(this.lastResult)
    appendUpdateLog(logPath, `System update started at ${startedAt}`)
    appendUpdateLog(logPath, `Previous commit: ${previousCommit || 'unknown'}`)

    try {
      const backupStep = await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Backup master and tenant databases', npmCommand(), [
        'run',
        'db:backup',
      ])
      const backup = parseBackupDetails(backupStep.output)
      backupId = backup.backupId
      backupPath = backup.backupPath
      this.lastResult = {
        ...this.lastResult,
        backupId,
        backupPath,
        recoveryAction: recoveryAction({ ...this.lastResult, backupId, previousCommit }),
      }
      persistUpdateResult(this.lastResult)

      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Fetch remote release metadata', 'git', [
        'fetch',
        upstream ? upstream.split('/')[0] : '--all',
        '--prune',
      ])
      targetCommit = upstream
        ? await runText(repositoryRoot, 'git', ['rev-parse', upstream])
        : null
      this.lastResult = { ...this.lastResult, targetCommit }
      persistUpdateResult(this.lastResult)

      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Reset working tree to release target', 'git', [
        'reset',
        '--hard',
        upstream ?? 'HEAD',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Update npm CLI', npmCommand(), [
        'install',
        '-g',
        'npm@latest',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Update npm workspace packages', npmCommand(), [
        'update',
        '--workspaces',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Install dependencies from lockfile', npmCommand(), [
        'ci',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Run controlled incremental database migrations', npmCommand(), [
        'run',
        'db:migrate',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Clean build output', nodeCommand(), [
        '-e',
        "require('fs').rmSync('build',{recursive:true,force:true})",
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Build active apps', npmCommand(), [
        'run',
        'build:active',
      ])
      await this.runRequiredStep(
        repositoryRoot,
        this.lastResult,
        steps,
        'Restart active app processes',
        npmCommand(),
        ['run', 'restart:active'],
      )

      const backendHealth = await checkUrl(backendHealthUrl())
      const frontendHealth = await checkUrl(frontendUrl())
      const finishedAt = new Date().toISOString()
      const result: SystemUpdateResult = {
        ok: backendHealth && frontendHealth && steps.every((step) => step.ok),
        phase: backendHealth && frontendHealth && steps.every((step) => step.ok) ? 'completed' : 'failed',
        startedAt,
        finishedAt,
        repositoryRoot,
        runId,
        backupId,
        backupPath,
        previousCommit,
        targetCommit,
        lastCommand: steps.at(-1)?.command,
        logPath,
        recoveryAction: recoveryAction({ backupId, previousCommit }),
        backendHealth,
        frontendHealth,
        steps,
      }

      this.lastResult = result
      persistUpdateResult(result)
      appendUpdateLog(logPath, `System update completed with status: ${result.ok ? 'ok' : 'failed'}`)
    } catch (error) {
      const finishedAt = new Date().toISOString()
      const result: SystemUpdateResult = {
        ok: false,
        phase: 'failed',
        startedAt,
        finishedAt,
        repositoryRoot,
        runId,
        backupId,
        backupPath,
        previousCommit,
        targetCommit,
        lastCommand: steps.at(-1)?.command,
        logPath,
        recoveryAction: recoveryAction({ backupId, previousCommit }),
        backendHealth: await checkUrl(backendHealthUrl()),
        frontendHealth: await checkUrl(frontendUrl()),
        steps,
        error: error instanceof Error ? error.message : String(error),
      }

      this.lastResult = result
      persistUpdateResult(result)
      appendUpdateLog(logPath, `System update failed: ${result.error ?? 'unknown error'}`)
    } finally {
      this.isRunning = false
    }
  }

  private async runRollback(backupId: string, previousCommit: string): Promise<void> {
    this.isRunning = true
    const startedAt = new Date().toISOString()
    const runId = `rollback-${timestampId()}`
    const repositoryRoot = findWorkspaceRoot()
    const logPath = updateLogPath(repositoryRoot, runId)
    const steps: SystemUpdateStep[] = []

    this.lastResult = {
      ok: false,
      phase: 'rollback',
      startedAt,
      finishedAt: startedAt,
      repositoryRoot,
      runId,
      backupId,
      previousCommit,
      logPath,
      backendHealth: false,
      frontendHealth: false,
      steps,
      recoveryAction: `Manual fallback: npm run db:restore -- ${backupId} && git reset --hard ${previousCommit}`,
    }
    persistUpdateResult(this.lastResult)
    appendUpdateLog(logPath, `Rollback started at ${startedAt}`)
    appendUpdateLog(logPath, `Backup ID: ${backupId}`)
    appendUpdateLog(logPath, `Previous commit: ${previousCommit}`)

    try {
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Restore database backup', npmCommand(), [
        'run',
        'db:restore',
        '--',
        backupId,
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Reset code to previous commit', 'git', [
        'reset',
        '--hard',
        previousCommit,
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Install previous dependencies', npmCommand(), [
        'ci',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Rebuild previous version', npmCommand(), [
        'run',
        'build:active',
      ])
      await this.runRequiredStep(repositoryRoot, this.lastResult, steps, 'Restart restored app processes', npmCommand(), [
        'run',
        'restart:active',
      ])

      const backendHealth = await checkUrl(backendHealthUrl())
      const frontendHealth = await checkUrl(frontendUrl())
      const result: SystemUpdateResult = {
        ok: backendHealth && frontendHealth && steps.every((step) => step.ok),
        phase: backendHealth && frontendHealth && steps.every((step) => step.ok) ? 'completed' : 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        repositoryRoot,
        runId,
        backupId,
        previousCommit,
        lastCommand: steps.at(-1)?.command,
        logPath,
        recoveryAction: `Rollback attempted from backup ${backupId} to ${previousCommit}.`,
        backendHealth,
        frontendHealth,
        steps,
      }
      this.lastResult = result
      persistUpdateResult(result)
    } catch (error) {
      const result: SystemUpdateResult = {
        ok: false,
        phase: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        repositoryRoot,
        runId,
        backupId,
        previousCommit,
        lastCommand: steps.at(-1)?.command,
        logPath,
        recoveryAction: `Manual fallback: npm run db:restore -- ${backupId} && git reset --hard ${previousCommit}`,
        backendHealth: await checkUrl(backendHealthUrl()),
        frontendHealth: await checkUrl(frontendUrl()),
        steps,
        error: error instanceof Error ? error.message : String(error),
      }
      this.lastResult = result
      persistUpdateResult(result)
      appendUpdateLog(logPath, `Rollback failed: ${result.error ?? 'unknown error'}`)
    } finally {
      this.isRunning = false
    }
  }

  private startDetachedUpdateScript() {
    const repositoryRoot = findWorkspaceRoot()
    const startedAt = new Date().toISOString()
    const scriptPath = resolve(repositoryRoot, 'update.sh')
    const child = spawn(shellCommand(), [scriptPath], {
      cwd: repositoryRoot,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        CXSUN_UPDATE_SOURCE: 'dashboard',
      },
    })

    child.unref()
    this.lastResult = {
      ok: true,
      phase: 'updating',
      startedAt,
      finishedAt: new Date().toISOString(),
      repositoryRoot,
      runId: `script-${timestampId()}`,
      backendHealth: false,
      frontendHealth: false,
      steps: [
        {
          name: 'Launch update.sh recovery script',
          command: `${shellCommand()} ${scriptPath}`,
          ok: true,
          required: true,
          startedAt,
          finishedAt: new Date().toISOString(),
          output: 'update.sh launched as a detached process. The backend and frontend ports may go offline while the script stops, updates, builds, and restarts the app.',
        },
      ],
      lastCommand: `${shellCommand()} ${scriptPath}`,
      recoveryAction: 'If update.sh fails, open the terminal log, restore the latest database backup, then reset Git to the previous known-good commit.',
    }
    persistUpdateResult(this.lastResult)
  }

  private async runRequiredStep(
    repositoryRoot: string,
    currentResult: SystemUpdateResult,
    steps: SystemUpdateStep[],
    name: string,
    command: string,
    args: string[],
  ) {
    const step = await runStep(repositoryRoot, name, command, args)
    steps.push(step)
    appendUpdateLog(currentResult.logPath, `\n[${step.ok ? 'ok' : 'failed'}] ${step.name}`)
    appendUpdateLog(currentResult.logPath, `$ ${step.command ?? ''}`)
    appendUpdateLog(currentResult.logPath, step.output || 'No output')
    this.lastResult = {
      ...currentResult,
      finishedAt: step.finishedAt,
      steps: [...steps],
      lastCommand: step.command,
      error: step.ok ? undefined : `${name} failed.`,
    }
    persistUpdateResult(this.lastResult)

    if (!step.ok) {
      throw new Error(`${name} failed.`)
    }

    return step
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
      required: true,
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

    return {
      name,
      command: commandLabel,
      ok: false,
      required: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      output: trimOutput(`${execError.stdout ?? ''}\n${execError.stderr ?? execError.message ?? ''}`),
    }
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

function nodeCommand() {
  return process.platform === 'win32' ? 'node.exe' : 'node'
}

function shellCommand() {
  return process.platform === 'win32' ? 'bash.exe' : 'bash'
}

function trimOutput(output: string) {
  return output.trim().slice(-12_000)
}

function parseBackupDetails(output: string) {
  const completed = output.match(/Database backup completed:\s*(.+)$/m)
  const creating = output.match(/Creating database backup:\s*(.+)$/m)
  const backupPath = (completed?.[1] ?? creating?.[1])?.trim()
  const backupId = backupPath ? backupPath.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) : undefined

  return { backupId, backupPath }
}

function recoveryAction(input: Pick<Partial<SystemUpdateResult>, 'backupId' | 'previousCommit'>) {
  if (!input.backupId || !input.previousCommit) {
    return 'Recovery needs a completed database backup and previous Git commit. Check the update log before continuing.'
  }

  return `Use Rollback from this page, or run: npm run db:restore -- ${input.backupId} && git reset --hard ${input.previousCommit} && npm ci && npm run build:active && npm run restart:active`
}

function updateStatePath(repositoryRoot: string) {
  return resolve(repositoryRoot, 'storage', 'system-update', 'status.json')
}

function updateLogPath(repositoryRoot: string, runId: string) {
  return resolve(repositoryRoot, 'storage', 'system-update', 'runs', `${runId}.log`)
}

function persistUpdateResult(result: SystemUpdateResult) {
  try {
    const path = updateStatePath(result.repositoryRoot)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  } catch {
    // Keep update execution alive even if the status file cannot be written.
  }
}

function readPersistedUpdateResult() {
  try {
    const repositoryRoot = findWorkspaceRoot()
    const path = updateStatePath(repositoryRoot)
    if (!existsSync(path)) {
      return null
    }

    return JSON.parse(readFileSync(path, 'utf8')) as SystemUpdateResult
  } catch {
    return null
  }
}

function appendUpdateLog(path: string | undefined, line: string) {
  if (!path) {
    return
  }

  try {
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, `${line}\n`, 'utf8')
  } catch {
    // Status JSON is the primary update record; log writing should not fail the update.
  }
}

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
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
