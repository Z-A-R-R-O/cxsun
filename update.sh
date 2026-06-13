#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
BACKEND_PORT="${PORT:-6005}"
FRONTEND_PORT="${VITE_PORT:-6010}"
UPDATE_RUN_ID="script-$(date -u +%Y%m%d-%H%M%S)"
UPDATE_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
UPDATE_STATUS_DIR="$ROOT_DIR/storage/system-update"
UPDATE_LOG_DIR="$UPDATE_STATUS_DIR/runs"
UPDATE_LOG_PATH="$UPDATE_LOG_DIR/${UPDATE_RUN_ID}.log"
UPDATE_STATUS_PATH="$UPDATE_STATUS_DIR/status.json"
PREVIOUS_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
TARGET_COMMIT=""
BACKUP_ID=""
BACKUP_PATH=""
CURRENT_STEP="starting"

mkdir -p "$UPDATE_LOG_DIR"
exec > >(tee -a "$UPDATE_LOG_PATH") 2>&1

log_step() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

run_step() {
  CURRENT_STEP="$1"
  shift

  log_step "START: ${CURRENT_STEP}"
  step_started_at="$(date +%s)"
  "$@"
  step_finished_at="$(date +%s)"
  echo "DONE: ${CURRENT_STEP} ($((step_finished_at - step_started_at))s)"
}

write_status() {
  phase="$1"
  ok="$2"
  error="${3:-}"
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  export UPDATE_STATUS_PATH ROOT_DIR UPDATE_RUN_ID UPDATE_STARTED_AT UPDATE_LOG_PATH PREVIOUS_COMMIT TARGET_COMMIT BACKUP_ID BACKUP_PATH CURRENT_STEP phase ok error finished_at
  node --input-type=module <<'NODE'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const env = process.env
const result = {
  ok: env.ok === 'true',
  phase: env.phase,
  startedAt: env.UPDATE_STARTED_AT,
  finishedAt: env.finished_at,
  repositoryRoot: env.ROOT_DIR,
  runId: env.UPDATE_RUN_ID,
  backupId: env.BACKUP_ID || undefined,
  backupPath: env.BACKUP_PATH || undefined,
  previousCommit: env.PREVIOUS_COMMIT || undefined,
  targetCommit: env.TARGET_COMMIT || null,
  lastCommand: env.CURRENT_STEP || undefined,
  logPath: env.UPDATE_LOG_PATH,
  recoveryAction: env.BACKUP_ID && env.PREVIOUS_COMMIT
    ? `Manual fallback: npm run db:restore -- ${env.BACKUP_ID} && git reset --hard ${env.PREVIOUS_COMMIT} && npm ci && npm run build:active && npm run restart:active`
    : 'Recovery needs a completed database backup and previous Git commit. Check the update.sh log before continuing.',
  backendHealth: false,
  frontendHealth: false,
  steps: [
    {
      name: 'Run update.sh recovery script',
      command: env.CURRENT_STEP || 'update.sh',
      ok: env.ok === 'true',
      required: true,
      startedAt: new Date().toISOString(),
      finishedAt: env.finished_at,
      output: env.error || `See log: ${env.UPDATE_LOG_PATH}`,
    },
  ],
  error: env.error || undefined,
}

mkdirSync(dirname(env.UPDATE_STATUS_PATH), { recursive: true })
writeFileSync(env.UPDATE_STATUS_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
NODE
}

on_error() {
  code="$?"
  write_status "failed" "false" "update.sh failed during: ${CURRENT_STEP} (exit ${code}). See ${UPDATE_LOG_PATH}"
  exit "$code"
}

trap on_error ERR

if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
  BRANCH="main"
fi

echo "Updating CXSun from ${REMOTE}/${BRANCH}"
echo "Repository: $ROOT_DIR"
echo "Previous commit: ${PREVIOUS_COMMIT:-unknown}"
echo "Log: $UPDATE_LOG_PATH"
write_status "updating" "false" ""

kill_port() {
  port="$1"
  label="$2"

  if [ -z "$port" ]; then
    return 0
  fi

  echo "Checking ${label} port ${port}"

  pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi

  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "${port}/tcp" 2>/dev/null || true)"
  fi

  if [ -z "$pids" ] && command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
  fi

  if [ -z "$pids" ]; then
    echo "No process is listening on ${label} port ${port}"
    return 0
  fi

  echo "Stopping ${label} process(es) on port ${port}: ${pids}"
  for pid in $pids; do
    if [ "$pid" = "$$" ]; then
      continue
    fi

    kill "$pid" 2>/dev/null || true
  done

  sleep 2

  for pid in $pids; do
    if [ "$pid" = "$$" ]; then
      continue
    fi

    if kill -0 "$pid" 2>/dev/null; then
      echo "Force stopping PID ${pid}"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

CURRENT_STEP="stop backend port ${BACKEND_PORT}"
kill_port "$BACKEND_PORT" "backend"
CURRENT_STEP="stop frontend port ${FRONTEND_PORT}"
kill_port "$FRONTEND_PORT" "frontend"

CURRENT_STEP="database backup"
log_step "START: ${CURRENT_STEP}"
backup_started_at="$(date +%s)"
BACKUP_OUTPUT="$(mktemp)"
npm run db:backup 2>&1 | tee "$BACKUP_OUTPUT"
BACKUP_PATH="$(sed -n 's/^Database backup completed:[[:space:]]*//p' "$BACKUP_OUTPUT" | tail -n 1)"
if [ -z "$BACKUP_PATH" ]; then
  BACKUP_PATH="$(sed -n 's/^Creating database backup:[[:space:]]*//p' "$BACKUP_OUTPUT" | tail -n 1)"
fi
if [ -n "$BACKUP_PATH" ]; then
  BACKUP_ID="$(basename "$BACKUP_PATH")"
fi
rm -f "$BACKUP_OUTPUT"
echo "Backup ID: ${BACKUP_ID:-not-captured}"
backup_finished_at="$(date +%s)"
echo "DONE: ${CURRENT_STEP} ($((backup_finished_at - backup_started_at))s)"
write_status "updating" "false" ""

run_step "git fetch ${REMOTE}/${BRANCH}" git fetch "$REMOTE" "$BRANCH" --prune
TARGET_COMMIT="$(git rev-parse "${REMOTE}/${BRANCH}")"
echo "Target commit: ${TARGET_COMMIT:-unknown}"
run_step "git reset --hard ${REMOTE}/${BRANCH}" git reset --hard "${REMOTE}/${BRANCH}"
run_step "git clean -fd" git clean -fd

echo "Removing old build output"
run_step "remove build output" rm -rf build

if [ -f package-lock.json ]; then
  run_step "npm install -g npm@latest" npm install -g npm@latest
  run_step "npm ci" npm ci
else
  run_step "npm install -g npm@latest" npm install -g npm@latest
  run_step "npm install" npm install
fi

run_step "npm run db:migrate" npm run db:migrate
run_step "npm run build:active" npm run build:active
CURRENT_STEP="npm run restart:active"
write_status "completed" "true" ""
run_step "npm run restart:active" npm run restart:active
