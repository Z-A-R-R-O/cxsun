import { execFile } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultPorts = [3000, 3001, 4000];

function parsePorts() {
  const arg = process.argv.find((item) => item.startsWith("--ports="));
  if (!arg) {
    return defaultPorts;
  }

  return arg
    .slice("--ports=".length)
    .split(",")
    .map((port) => Number(port.trim()))
    .filter((port) => Number.isInteger(port) && port > 0);
}

async function command(file, args) {
  try {
    const result = await execFileAsync(file, args, { windowsHide: true });
    return result.stdout;
  } catch (error) {
    return `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
}

async function findWindowsPids(ports) {
  const output = await command("netstat", ["-ano"]);
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) {
      continue;
    }

    if (!ports.some((port) => line.includes(`:${port} `))) {
      continue;
    }

    const columns = line.trim().split(/\s+/);
    const pid = Number(columns.at(-1));
    if (Number.isInteger(pid) && pid > 0) {
      pids.add(pid);
    }
  }

  return [...pids];
}

async function findUnixPids(ports) {
  const pids = new Set();

  for (const port of ports) {
    const output = await command("lsof", ["-ti", `tcp:${port}`]);
    for (const line of output.split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0) {
        pids.add(pid);
      }
    }
  }

  return [...pids];
}

async function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function stopWindows(pid) {
  await command("taskkill", ["/PID", String(pid), "/T"]);
  await sleep(1200);

  if (await isRunning(pid)) {
    await command("taskkill", ["/PID", String(pid), "/T", "/F"]);
  }
}

async function stopUnix(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  await sleep(1200);

  if (await isRunning(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Process already exited.
    }
  }
}

async function main() {
  const ports = parsePorts();
  let stoppedAny = false;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const pids = platform() === "win32" ? await findWindowsPids(ports) : await findUnixPids(ports);

    if (pids.length === 0) {
      if (!stoppedAny) {
        console.log(`No dev servers are listening on ports ${ports.join(", ")}.`);
      } else {
        console.log("Dev ports released.");
      }
      return;
    }

    stoppedAny = true;
    console.log(`Stopping dev processes on ports ${ports.join(", ")}: ${pids.join(", ")}`);

    for (const pid of pids) {
      if (platform() === "win32") {
        await stopWindows(pid);
      } else {
        await stopUnix(pid);
      }
    }

    await sleep(500);
  }

  throw new Error(`Unable to release ports ${ports.join(", ")} after multiple attempts.`);
}

await main();
