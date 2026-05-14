import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

interface DesktopServiceOptions {
  readonly backendHealthUrl: string;
  readonly frontendUrl: string;
  readonly readinessTimeoutMs: number;
}

const managedProcesses: ChildProcess[] = [];

export function isDesktopServiceManagementEnabled() {
  return (process.env.DESKTOP_START_SERVICES ?? "true").trim().toLowerCase() !== "false";
}

export async function startDesktopServices(options: DesktopServiceOptions): Promise<void> {
  if (!isDesktopServiceManagementEnabled()) {
    return;
  }

  const workspaceRoot = findWorkspaceRoot();

  if (process.env.DESKTOP_PREPARE_DB !== "false") {
    await runPnpm(["--filter", "@cxnext/db", "db:prepare"], {
      cwd: workspaceRoot,
      label: "db",
    });
  }

  if (!(await waitForUrl(options.backendHealthUrl, 1_000))) {
    managedProcesses.push(
      spawnPnpm(["--filter", "@cxnext/server", "start"], {
        cwd: workspaceRoot,
        label: "server",
      }),
    );
  }

  if (!(await waitForUrl(options.frontendUrl, 1_000))) {
    managedProcesses.push(
      spawnPnpm(["--filter", "@cxnext/frontend", "start"], {
        cwd: workspaceRoot,
        label: "frontend",
      }),
    );
  }

  const [backendReady, frontendReady] = await Promise.all([
    waitForUrl(options.backendHealthUrl, options.readinessTimeoutMs),
    waitForUrl(options.frontendUrl, options.readinessTimeoutMs),
  ]);

  if (!backendReady) {
    throw new Error(`Desktop backend was not ready at ${options.backendHealthUrl}.`);
  }

  if (!frontendReady) {
    throw new Error(`Desktop frontend was not ready at ${options.frontendUrl}.`);
  }
}

export function stopDesktopServices(): void {
  for (const child of managedProcesses.splice(0)) {
    if (!child.killed) {
      child.kill();
    }
  }
}

export async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // The service is still starting.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  return false;
}

function findWorkspaceRoot() {
  let currentDirectory = path.resolve(__dirname, "..", "..", "..");

  while (true) {
    if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error("Could not locate workspace root for desktop services.");
    }

    currentDirectory = parentDirectory;
  }
}

function runPnpm(
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly label: string;
  },
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawnPnpm(args, options);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${options.label} command failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

function spawnPnpm(
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly label: string;
  },
) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const commandArgs =
    process.platform === "win32" ? ["/d", "/c", "corepack", "pnpm", ...args] : ["pnpm", ...args];

  const child = spawn(command, commandArgs, {
    cwd: options.cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(`[${options.label}] ${chunk.toString()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[${options.label}] ${chunk.toString()}`);
  });

  return child;
}
