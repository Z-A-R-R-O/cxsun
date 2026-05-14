import { ConflictException, Injectable, OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AuthRequestContext } from "../../modules/auth/interface/http/auth-context";

type SystemUpdateAction = "build" | "deploy" | "preflight" | "restart" | "rollback" | "smoke" | "status" | "sync";
type SystemUpdateOperation = {
  readonly action: SystemUpdateAction;
  readonly operationId: string;
  readonly startedAt: string;
};
type DynamicDatabase = Record<string, Record<string, unknown>>;

@Injectable()
export class SystemUpdateService implements OnModuleDestroy {
  private readonly rootDirectory = findWorkspaceRoot(process.cwd());
  private readonly connection: DatabaseConnection;
  private activeOperation: SystemUpdateOperation | null = null;
  private operationSequence = 0;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy() {
    await this.connection.destroy();
  }

  public status() {
    return this.run("status", 120_000).then(async (status) => ({
      ...this.withActiveOperation(status),
      history: await this.listHistory(10),
      rollbackTarget: await this.findRollbackTarget(),
    }));
  }

  public preflight() {
    return this.run("preflight", 120_000);
  }

  public sync(auth: AuthRequestContext | null) {
    return this.runWritableAction("sync", 180_000, auth);
  }

  public build(auth: AuthRequestContext | null) {
    return this.runWritableAction("build", 900_000, auth);
  }

  public restart(auth: AuthRequestContext | null) {
    return this.runWritableAction("restart", 180_000, auth);
  }

  public smoke(auth: AuthRequestContext | null) {
    return this.runWritableAction("smoke", 180_000, auth);
  }

  public deploy(auth: AuthRequestContext | null) {
    return this.runWritableAction("deploy", 1_200_000, auth);
  }

  public async rollback(auth: AuthRequestContext | null, targetCommit?: string | null) {
    const rollbackCommit = targetCommit?.trim() || (await this.findRollbackTarget());
    if (!rollbackCommit) {
      throw new ConflictException({
        action: "rollback",
        status: "blocked",
        message: "Rollback is not available yet because no successful deploy with a previous commit was found.",
        timestamp: new Date().toISOString(),
      });
    }
    return this.runWritableAction("rollback", 1_200_000, auth, { ROLLBACK_COMMIT: rollbackCommit });
  }

  public listHistory(limit = 20) {
    return this.readHistory(limit);
  }

  private async runWritableAction(
    action: SystemUpdateAction,
    timeoutMs: number,
    auth: AuthRequestContext | null,
    env?: NodeJS.ProcessEnv,
  ) {
    if (process.env.SYSTEM_UPDATE_ENABLED !== "true") {
      return Promise.resolve({
        action,
        status: "disabled",
        message: "System update is disabled. Set SYSTEM_UPDATE_ENABLED=true to allow update actions.",
        timestamp: new Date().toISOString(),
      });
    }

    if (this.activeOperation) {
      const runningAction = this.activeOperation.action;
      throw new ConflictException({
        action,
        operation: this.activeOperation,
        runningAction,
        status: "busy",
        message: `System update ${runningAction} is already running. Wait for it to finish before starting ${action}.`,
        timestamp: new Date().toISOString(),
      });
    }

    const operation = await this.startOperation(action, auth);
    try {
      const result = await this.run(action, timeoutMs, operation, env);
      await this.finishOperationRecord(operation, result);
      return {
        ...result,
        finishedAt: new Date().toISOString(),
        operation,
      };
    } finally {
      this.finishOperation(operation);
    }
  }

  private run(
    action: SystemUpdateAction,
    timeoutMs: number,
    operation?: SystemUpdateOperation,
    env?: NodeJS.ProcessEnv,
  ) {
    const scriptPath = path.join(this.rootDirectory, "scripts", "system-update.mjs");

    return new Promise<Record<string, unknown>>((resolve) => {
      const child = spawn(process.execPath, [scriptPath, action, "--json"], {
        cwd: this.rootDirectory,
        env: { ...process.env, ...env },
        shell: false,
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        if (operation) void this.updateOperationOutput(operation, { stdout, stderr, progressPercent: 25 });
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
        if (operation) void this.updateOperationOutput(operation, { stdout, stderr, progressPercent: 25 });
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        resolve({
          action,
          status: "failed",
          message: error.message,
          stderr,
          timestamp: new Date().toISOString(),
        });
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        const parsed = parseJsonOutput(stdout);
        resolve({
          action,
          exitCode: Number(code ?? 0),
          stderr: stderr.trim(),
          stdout: stdout.trim(),
          ...(parsed ?? {
            status: code === 0 ? "ok" : "failed",
            message: stderr.trim() || stdout.trim() || `System update action ${action} completed.`,
            timestamp: new Date().toISOString(),
          }),
        });
      });
    });
  }

  private async startOperation(action: SystemUpdateAction, auth: AuthRequestContext | null): Promise<SystemUpdateOperation> {
    const operation = {
      action,
      operationId: `${Date.now()}-${++this.operationSequence}`,
      startedAt: new Date().toISOString(),
    };
    this.activeOperation = operation;
    await this.createOperationRecord(operation, auth);
    return operation;
  }

  private finishOperation(operation: SystemUpdateOperation) {
    if (this.activeOperation?.operationId === operation.operationId) {
      this.activeOperation = null;
    }
  }

  private withActiveOperation(status: Record<string, unknown>) {
    if (!this.activeOperation) return status;
    return {
      ...status,
      activeOperation: this.activeOperation,
      maintenanceMode: isMaintenanceAction(this.activeOperation.action),
      runningAction: this.activeOperation.action,
      status: "running",
    };
  }

  private async createOperationRecord(operation: SystemUpdateOperation, auth: AuthRequestContext | null) {
    try {
      await this.db()
        .insertInto("system_update_operations")
        .values({
          operation_id: operation.operationId,
          action: operation.action,
          status: "running",
          message: `System update ${operation.action} started.`,
          progress_percent: 5,
          requested_by_user_id: auth?.user.id ?? null,
          requested_by_name: auth?.user.displayName ?? auth?.user.email ?? null,
          started_at: operation.startedAt,
          created_at: operation.startedAt,
          updated_at: operation.startedAt,
        })
        .execute();
    } catch {
      // Databases that have not run the latest migration still keep the in-memory lock.
    }
  }

  private async updateOperationOutput(
    operation: SystemUpdateOperation,
    params: { readonly stdout: string; readonly stderr: string; readonly progressPercent: number },
  ) {
    try {
      await this.db()
        .updateTable("system_update_operations")
        .set({
          stdout: tail(params.stdout),
          stderr: tail(params.stderr),
          progress_percent: params.progressPercent,
          updated_at: new Date(),
        })
        .where("operation_id", "=", operation.operationId)
        .execute();
    } catch {
      // Progress persistence is best-effort until migrations exist.
    }
  }

  private async finishOperationRecord(operation: SystemUpdateOperation, result: Record<string, unknown>) {
    const git = readObject(result.git);
    const backup = readObject(result.backup);
    const status = typeof result.status === "string" ? result.status : "failed";
    const now = new Date();

    try {
      await this.db()
        .updateTable("system_update_operations")
        .set({
          deploy_dir: stringOrNull(result.deployDir),
          finished_at: now,
          git_branch: stringOrNull(result.gitBranch),
          git_url: stringOrNull(result.gitUrl),
          local_commit: stringOrNull(git?.localCommit),
          message: stringOrNull(result.message) ?? (status === "ok" ? "System update completed." : "System update failed."),
          previous_commit: stringOrNull(result.previousCommit),
          progress_percent: status === "ok" ? 100 : 0,
          remote_commit: stringOrNull(git?.remoteCommit),
          result_json: JSON.stringify({ ...result, backup }),
          status,
          stderr: tail(stringOrNull(result.stderr) ?? ""),
          stdout: tail(stringOrNull(result.stdout) ?? ""),
          target_commit: stringOrNull(git?.localCommit),
          updated_at: now,
        })
        .where("operation_id", "=", operation.operationId)
        .execute();
    } catch {
      // History persistence is best-effort until migrations exist.
    }
  }

  private async readHistory(limit: number) {
    try {
      const rows = await this.db()
        .selectFrom("system_update_operations")
        .selectAll()
        .orderBy("started_at", "desc")
        .limit(Math.min(Math.max(limit, 1), 50))
        .execute();
      return rows.map((row) => ({
        action: row.action,
        finishedAt: toIso(row.finished_at),
        gitBranch: row.git_branch,
        id: row.id,
        localCommit: row.local_commit,
        message: row.message,
        operationId: row.operation_id,
        previousCommit: row.previous_commit,
        progressPercent: Number(row.progress_percent ?? 0),
        remoteCommit: row.remote_commit,
        requestedByName: row.requested_by_name,
        startedAt: toIso(row.started_at),
        status: row.status,
        stderr: row.stderr,
        stdout: row.stdout,
        targetCommit: row.target_commit,
      }));
    } catch {
      return [];
    }
  }

  private async findRollbackTarget() {
    try {
      const row = await this.db()
        .selectFrom("system_update_operations")
        .select("previous_commit")
        .where("action", "=", "deploy")
        .where("status", "=", "ok")
        .where("previous_commit", "is not", null)
        .orderBy("finished_at", "desc")
        .executeTakeFirst();
      return typeof row?.previous_commit === "string" && row.previous_commit ? row.previous_commit : null;
    } catch {
      return null;
    }
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function isMaintenanceAction(action: SystemUpdateAction) {
  return action === "deploy" || action === "restart" || action === "rollback";
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function tail(value: string, maxLength = 60_000) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
}

function parseJsonOutput(value: string) {
  try {
    const startIndex = value.indexOf("{");
    if (startIndex === -1) return null;
    return JSON.parse(value.slice(startIndex)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findWorkspaceRoot(startDirectory: string) {
  let current = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startDirectory);
    current = parent;
  }
}
