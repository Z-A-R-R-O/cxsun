import { execFile } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CHANGELOG_PATH,
  formatChangelogCommitSubject,
  readLatestChangelogEntry,
} from "./changelog.mjs";

const execFileAsync = promisify(execFile);

function trim(value) {
  return value.replace(/\r?\n$/, "");
}

export function parseGitStatusPorcelain(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    hasChanges: lines.length > 0,
    stagedCount: lines.filter((line) => !line.startsWith("??") && line[0] !== " ").length,
    unstagedCount: lines.filter((line) => !line.startsWith("??") && line[1] !== " ").length,
    untrackedCount: lines.filter((line) => line.startsWith("??")).length,
  };
}

export function parseAheadBehind(raw) {
  const [aheadRaw = "0", behindRaw = "0"] = raw.trim().split(/\s+/);

  return {
    ahead: Number.parseInt(aheadRaw, 10) || 0,
    behind: Number.parseInt(behindRaw, 10) || 0,
  };
}

export function parseCliOptions(argv) {
  return {
    yes: argv.includes("--yes") || argv.includes("-y"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

async function runGit(args, cwd, allowFailure = false) {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
    });

    return { ok: true, stdout, stderr };
  } catch (error) {
    const execError = error;

    if (!allowFailure) {
      throw new Error(execError.stderr?.trim() || execError.message, { cause: error });
    }

    return {
      ok: false,
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? execError.message,
    };
  }
}

async function getRepositoryRoot(cwd) {
  const result = await runGit(["rev-parse", "--show-toplevel"], cwd);

  return trim(result.stdout);
}

async function inspectRepository(cwd) {
  const rootDir = await getRepositoryRoot(cwd);
  const gitDirRaw = trim((await runGit(["rev-parse", "--git-dir"], rootDir)).stdout);
  const gitDir = join(rootDir, gitDirRaw);
  const branch = trim((await runGit(["branch", "--show-current"], rootDir, true)).stdout);
  const upstreamResult = await runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    rootDir,
    true,
  );
  const remoteResult = await runGit(["remote"], rootDir, true);
  const status = parseGitStatusPorcelain((await runGit(["status", "--porcelain"], rootDir)).stdout);
  const remotes = remoteResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const upstream = upstreamResult.ok ? trim(upstreamResult.stdout) : null;
  const remote = upstream
    ? upstream.split("/")[0]
    : remotes.includes("origin")
      ? "origin"
      : remotes[0];
  const operation = detectGitOperation(gitDir);
  let aheadBehind = { ahead: 0, behind: 0 };

  if (upstream) {
    await runGit(["fetch", remote ?? "origin"], rootDir, true);
    aheadBehind = parseAheadBehind(
      (await runGit(["rev-list", "--left-right", "--count", `${upstream}...HEAD`], rootDir)).stdout,
    );
  }

  return { rootDir, branch, upstream, remote, status, aheadBehind, operation };
}

function detectGitOperation(gitDir) {
  const markers = [
    ["rebase-merge", "rebase in progress"],
    ["rebase-apply", "rebase in progress"],
    ["MERGE_HEAD", "merge in progress"],
    ["CHERRY_PICK_HEAD", "cherry-pick in progress"],
    ["REVERT_HEAD", "revert in progress"],
    ["BISECT_LOG", "bisect in progress"],
  ];

  for (const [marker, label] of markers) {
    if (existsSync(join(gitDir, marker))) {
      return label;
    }
  }

  return null;
}

async function promptYesNo(rl, label, autoYes) {
  if (autoYes) {
    output.write(`${label} [Y/n] y\n`);
    return true;
  }

  const answer = (await rl.question(`${label} [Y/n] `)).trim().toLowerCase();

  return !answer || answer === "y" || answer === "yes";
}

async function pullAndMerge(state) {
  if (!state.upstream || state.aheadBehind.behind === 0) {
    return;
  }

  const remoteBranch = state.upstream.split("/").slice(1).join("/");
  const result = await runGit(
    ["pull", "--no-rebase", "--autostash", state.remote ?? "origin", remoteBranch],
    state.rootDir,
    true,
  );

  if (!result.ok) {
    throw new Error(result.stderr.trim() || "git pull merge failed. Resolve conflicts manually.");
  }

  output.write("Pulled and merged upstream changes.\n");
}

async function commitChanges(state) {
  const entry = readLatestChangelogEntry(state.rootDir);
  const subject = formatChangelogCommitSubject(entry);

  await runGit(["add", "-A"], state.rootDir);

  const result = await runGit(["commit", "-m", subject], state.rootDir, true);
  const combinedOutput = `${result.stdout}\n${result.stderr}`.trim();

  if (!result.ok && !combinedOutput.includes("nothing to commit")) {
    throw new Error(result.stderr.trim() || "git commit failed.");
  }

  if (combinedOutput.includes("nothing to commit")) {
    output.write("No local changes to commit after staging.\n");
    return false;
  }

  output.write(`Committed with subject: ${subject}\n`);
  return true;
}

async function push(state) {
  const args = state.upstream ? ["push"] : ["push", "-u", state.remote ?? "origin", state.branch];
  const result = await runGit(args, state.rootDir, true);

  if (!result.ok) {
    throw new Error(result.stderr.trim() || "git push failed.");
  }

  output.write("Pushed branch successfully.\n");
}

function printHelp() {
  output.write(
    [
      "cxnext GitHub helper",
      "",
      "Usage:",
      "  pnpm github",
      "  pnpm github:now",
      "",
      "Behavior:",
      "  1. inspect repository state",
      "  2. fetch and pull/merge upstream updates when behind",
      "  3. stage all changes",
      `  4. commit using the latest ${CHANGELOG_PATH} entry title and reference`,
      "  5. push the current branch",
      "",
    ].join("\n"),
  );
}

export async function runGitHubHelper(cwd = process.cwd(), options = { yes: false, help: false }) {
  if (options.help) {
    printHelp();
    return 0;
  }

  const rl = createInterface({ input, output });

  try {
    let state = await inspectRepository(cwd);

    output.write(`Repository: ${state.rootDir}\n`);
    output.write(`Branch: ${state.branch || "(detached)"}\n`);
    output.write(`Upstream: ${state.upstream ?? "(none)"}\n`);
    output.write(
      `Changes: staged ${state.status.stagedCount}, unstaged ${state.status.unstagedCount}, untracked ${state.status.untrackedCount}\n`,
    );

    if (!state.branch) {
      throw new Error("Detached HEAD is not supported.");
    }

    if (state.operation) {
      throw new Error(`Git has ${state.operation}. Resolve it before using the helper.`);
    }

    if (!(await promptYesNo(rl, "Pull/merge, commit, and push now?", options.yes))) {
      throw new Error("Cancelled.");
    }

    await pullAndMerge(state);
    state = await inspectRepository(state.rootDir);
    await commitChanges(state);
    state = await inspectRepository(state.rootDir);
    await push(state);

    output.write("GitHub helper finished successfully.\n");
    return 0;
  } catch (error) {
    output.write(
      `GitHub helper failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  } finally {
    rl.close();
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  process.exitCode = await runGitHubHelper(process.cwd(), parseCliOptions(process.argv.slice(2)));
}
