import { Injectable } from "@nestjs/common";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export type SetupAction = "build" | "deploy" | "prepare-db" | "pull" | "smoke" | "start" | "status";

export interface SetupConfigureInput {
  readonly appHost?: string;
  readonly appHttpPort?: string;
  readonly frontendHttpPort?: string;
  readonly dbHost?: string;
  readonly dbPort?: string;
  readonly dbName?: string;
  readonly dbUser?: string;
  readonly dbPassword?: string;
  readonly jwtSecret?: string;
  readonly gitUrl?: string;
  readonly gitBranch?: string;
  readonly deployDir?: string;
}

@Injectable()
export class SetupService {
  private readonly root = findWorkspaceRoot(process.cwd());
  private readonly setupScript = path.join(this.root, "scripts", "setup.mjs");

  public status() {
    return this.run("status", []);
  }

  public configure(input: SetupConfigureInput) {
    const values = toEnvValues(input);
    return this.run("configure", values.map(([key, value]) => `--set=${key}=${value}`));
  }

  public runAction(action: SetupAction) {
    return this.run(action, [], action === "build" || action === "deploy" ? 1_200_000 : 300_000);
  }

  private run(command: string, args: readonly string[], timeoutMs = 120_000) {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [this.setupScript, command, "--json", ...args], {
        cwd: this.root,
        env: process.env,
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        resolve({
          exitCode: 1,
          message: error.message,
          status: "failed",
          stderr,
          stdout,
        });
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        const parsed = parseJson(stdout);
        resolve({
          ...(parsed ?? {}),
          exitCode: Number(code ?? 0),
          status: parsed?.status ?? (code === 0 ? "ok" : "failed"),
          stderr,
          stdout,
        });
      });
    });
  }
}

function toEnvValues(input: SetupConfigureInput) {
  return Object.entries({
    APP_HOST: input.appHost,
    APP_HTTP_PORT: input.appHttpPort,
    FRONTEND_HTTP_PORT: input.frontendHttpPort,
    DB_HOST: input.dbHost,
    DB_PORT: input.dbPort,
    DB_NAME: input.dbName,
    DB_USER: input.dbUser,
    DB_PASSWORD: input.dbPassword,
    JWT_SECRET: input.jwtSecret,
    GIT_URL: input.gitUrl,
    GIT_BRANCH: input.gitBranch,
    DEPLOY_DIR: input.deployDir,
    COMPOSE_FILE: ".container/docker-compose.yml",
    SYSTEM_UPDATE_ENABLED: "true",
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findWorkspaceRoot(startDirectory: string) {
  let current = path.resolve(startDirectory);
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return startDirectory;
    current = parent;
  }
}
