import { spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'

import { Injectable } from '../../decorators/injectable.js'
import { Inject } from '../../decorators/inject.js'
import { dbConfig } from '../../../framework/config/index.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'

type DatabaseOperation = 'backup' | 'restore'

export interface DatabaseOperationState {
  type: DatabaseOperation
  acceptedAt: string
  target?: string
  command: string
}

@Injectable()
export class DatabaseManagerService {
  private lastOperation: DatabaseOperationState | null = null

  constructor(
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async overview() {
    const tenants = await getDatabase()
      .selectFrom('tenants')
      .select(['slug', 'name', 'status', 'db_host', 'db_port', 'db_name', 'db_user'])
      .orderBy('slug', 'asc')
      .execute()

    return {
      master: {
        host: dbConfig.master.host,
        port: dbConfig.master.port,
        database: dbConfig.master.database,
        user: dbConfig.master.user,
      },
      tenants,
      backups: this.listBackups(),
      lastOperation: this.lastOperation,
    }
  }

  listBackups() {
    const root = backupRoot()
    if (!existsSync(root)) return []

    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const path = resolve(root, entry.name)
        const manifestPath = resolve(path, 'manifest.json')
        const manifest = existsSync(manifestPath) ? readManifest(manifestPath) : null
        return {
          id: entry.name,
          path,
          createdAt: manifest?.createdAt ?? statSync(path).mtime.toISOString(),
          databaseCount: Array.isArray(manifest?.databases) ? manifest.databases.length : 0,
          databases: Array.isArray(manifest?.databases) ? manifest.databases.map((item: { database?: string; label?: string }) => ({ label: item.label, database: item.database })) : [],
        }
      })
      .sort((a, b) => b.id.localeCompare(a.id))
  }

  async startBackup() {
    await this.queue.enqueue({
      type: 'database.backup.manual',
      payload: { source: 'database-manager', requestedAt: new Date().toISOString() },
    })

    this.lastOperation = {
      type: 'backup',
      command: 'queue:database.backup.manual',
      acceptedAt: new Date().toISOString(),
    }

    return { accepted: true, operation: this.lastOperation }
  }

  startRestore(backupId: string) {
    const selected = backupId?.trim() || 'latest'
    return this.startOperation('restore', selected)
  }

  private startOperation(type: DatabaseOperation, target?: string) {
    const args = ['apps/cli/database-backup.mjs', type]
    if (target) args.push(target)

    const command = `${nodeCommand()} ${args.join(' ')}`
    const child = spawn(nodeCommand(), args, {
      cwd: workspaceRoot(),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: process.env,
    })
    child.unref()

    this.lastOperation = {
      type,
      target,
      command,
      acceptedAt: new Date().toISOString(),
    }

    return { accepted: true, operation: this.lastOperation }
  }
}

function readManifest(path: string) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function workspaceRoot() {
  return resolve(process.cwd(), process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../..' : '.')
}

function backupRoot() {
  return resolve(workspaceRoot(), 'storage', 'backups', 'database')
}

function nodeCommand() {
  return process.platform === 'win32' ? 'node.exe' : 'node'
}
