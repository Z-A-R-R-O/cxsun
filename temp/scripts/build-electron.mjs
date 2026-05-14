import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

const workspaceBuildOrder = [
  "@cxnext/types",
  "@cxnext/config",
  "@cxnext/core",
  "@cxnext/event",
  "@cxnext/utils",
  "@cxnext/hooks",
  "@cxnext/ui",
  "@cxnext/db",
  "@cxnext/server",
  "@cxnext/frontend",
  "@cxnext/desktop"
];

const commandName = (command) => (process.platform === "win32" ? `${command}.cmd` : command);
const run = (command, commandArgs) =>
  new Promise((resolve, reject) => {
    const childCommand = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : commandName(command);
    const childArgs =
      process.platform === "win32"
        ? ["/d", "/c", commandName(command), ...commandArgs]
        : commandArgs;

    const child = spawn(childCommand, childArgs, {
      cwd: rootDir,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1"
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}`));
    });
  });

const pnpm = (...pnpmArgs) => run("corepack", ["pnpm", ...pnpmArgs]);

const buildWorkspace = async (workspace) => {
  console.log(`\n[desktop-build] Building ${workspace}`);
  await pnpm("--filter", workspace, "build");
};

const packageDesktop = async () => {
  const builderArgs = ["--filter", "@cxnext/desktop", "exec", "electron-builder"];

  if (args.has("--dir")) {
    builderArgs.push("--dir");
  } else {
    builderArgs.push("--win");
  }

  builderArgs.push("--publish", "never");

  console.log("\n[desktop-build] Packaging Electron desktop app");
  await pnpm(...builderArgs);
};

const main = async () => {
  const buildOnly = args.has("--skip-package") || args.has("--build-only");
  const packageOnly = args.has("--package-only");

  if (!packageOnly) {
    for (const workspace of workspaceBuildOrder) {
      await buildWorkspace(workspace);
    }
  }

  if (!buildOnly) {
    await packageDesktop();
  }

  console.log("\n[desktop-build] Complete");
};

main().catch((error) => {
  console.error(`\n[desktop-build] ${error.message}`);
  process.exitCode = 1;
});
