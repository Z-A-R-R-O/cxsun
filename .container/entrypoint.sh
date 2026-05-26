#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/workspace/cxsun}"
GIT_BRANCH="${GIT_BRANCH:-main}"
FRONTEND_PORT="${VITE_PORT:-6010}"
SERVER_PORT="${PORT:-6005}"
API_BASE_URL="${VITE_API_BASE_URL:-https://codexsun.com}"
FRONTEND_APP_URL="${FRONTEND_URL:-https://codexsun.com}"
CORS_ALLOWED_ORIGINS="${CORS_ORIGINS:-${FRONTEND_APP_URL},https://www.codexsun.com}"
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
DATABASE_HOST="${DB_HOST:-mariadb}"
DATABASE_PORT="${DB_PORT:-3306}"
DATABASE_NAME="${DB_NAME:-cxsun_master}"
DATABASE_USER="${DB_USER:-root}"
DATABASE_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
AUTH_JWT_SECRET="${JWT_SECRET:-}"
AUTH_SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-}"
AUTH_SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-}"
AUTH_SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
AUTH_SOFTWARE_ADMIN_NAME="${SOFTWARE_ADMIN_NAME:-}"
AUTH_SOFTWARE_ADMIN_EMAIL="${SOFTWARE_ADMIN_EMAIL:-}"
AUTH_SOFTWARE_ADMIN_PASSWORD="${SOFTWARE_ADMIN_PASSWORD:-}"
AUTH_TENANT_ADMIN_NAME="${TENANT_ADMIN_NAME:-}"
AUTH_TENANT_ADMIN_EMAIL="${TENANT_ADMIN_EMAIL:-}"
AUTH_TENANT_ADMIN_PASSWORD="${TENANT_ADMIN_PASSWORD:-}"
REDIS_SERVICE_HOST="${REDIS_HOST:-redis}"
REDIS_SERVICE_PORT="${REDIS_PORT:-6379}"
REDIS_SERVICE_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_SERVICE_DB="${REDIS_DB:-0}"
REDIS_SERVICE_TLS="${REDIS_TLS:-false}"
QUEUE_RUNTIME_ENABLED="${QUEUE_ENABLED:-true}"
DATABASE_BACKUP_INTERVAL="${DATABASE_BACKUP_INTERVAL_HOURS:-6}"
INSTALL_RUN_TESTS="${INSTALL_RUN_TESTS:-false}"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-900}"

log_step() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

mkdir -p "$(dirname "$APP_DIR")"

if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  log_step "Cloning $GIT_REPO_URL branch $GIT_BRANCH into $APP_DIR"
  git clone --branch "$GIT_BRANCH" "$GIT_REPO_URL" "$APP_DIR"
else
  log_step "Using existing repository at $APP_DIR"
fi

cd "$APP_DIR"

if [ "${GIT_PULL_ON_START:-false}" = "true" ]; then
  log_step "Pulling latest changes for $GIT_BRANCH"
  git fetch origin "$GIT_BRANCH"
  git pull --ff-only origin "$GIT_BRANCH"
fi

if [ ! -f .env ] && [ -f .env.sample ]; then
  log_step "Creating .env from .env.sample"
  cp .env.sample .env
fi

set_env_value() {
  key="$1"
  value="$2"

  if [ ! -f .env ]; then
    touch .env
  fi

  tmp_file="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      done = 1
      next
    }
    { print }
    END {
      if (done == 0) print key "=" value
    }
  ' .env > "$tmp_file"
  mv "$tmp_file" .env
}

get_env_value() {
  key="$1"

  if [ ! -f .env ]; then
    return 0
  fi

  grep "^${key}=" .env | tail -n 1 | cut -d= -f2- || true
}

set_env_optional() {
  key="$1"
  value="$2"

  if [ -n "$value" ]; then
    set_env_value "$key" "$value"
  fi
}

generate_secret() {
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
}

EXISTING_JWT_SECRET="$(get_env_value JWT_SECRET)"
if [ -z "$AUTH_JWT_SECRET" ]; then
  AUTH_JWT_SECRET="$EXISTING_JWT_SECRET"
fi

if [ -z "$AUTH_JWT_SECRET" ]; then
  AUTH_JWT_SECRET="$(generate_secret)"
  echo "Generated JWT_SECRET in .env"
fi

set_env_value "PORT" "$SERVER_PORT"
set_env_value "VITE_PORT" "$FRONTEND_PORT"
set_env_value "VITE_API_BASE_URL" "$API_BASE_URL"
set_env_value "FRONTEND_URL" "$FRONTEND_APP_URL"
set_env_value "CORS_ORIGINS" "$CORS_ALLOWED_ORIGINS"
set_env_value "ELECTRON_DEV_SERVER_URL" "$FRONTEND_APP_URL"
set_env_value "EXPO_PUBLIC_API_URL" "${API_BASE_URL}/api"
set_env_value "DB_HOST" "$DATABASE_HOST"
set_env_value "DB_PORT" "$DATABASE_PORT"
set_env_value "DB_NAME" "$DATABASE_NAME"
set_env_value "DB_USER" "$DATABASE_USER"
set_env_value "DB_PASSWORD" "$DATABASE_PASSWORD"
set_env_value "JWT_SECRET" "$AUTH_JWT_SECRET"
set_env_optional "SUPER_ADMIN_NAME" "$AUTH_SUPER_ADMIN_NAME"
set_env_optional "SUPER_ADMIN_EMAIL" "$AUTH_SUPER_ADMIN_EMAIL"
set_env_optional "SUPER_ADMIN_PASSWORD" "$AUTH_SUPER_ADMIN_PASSWORD"
set_env_optional "SOFTWARE_ADMIN_NAME" "$AUTH_SOFTWARE_ADMIN_NAME"
set_env_optional "SOFTWARE_ADMIN_EMAIL" "$AUTH_SOFTWARE_ADMIN_EMAIL"
set_env_optional "SOFTWARE_ADMIN_PASSWORD" "$AUTH_SOFTWARE_ADMIN_PASSWORD"
set_env_optional "TENANT_ADMIN_NAME" "$AUTH_TENANT_ADMIN_NAME"
set_env_optional "TENANT_ADMIN_EMAIL" "$AUTH_TENANT_ADMIN_EMAIL"
set_env_optional "TENANT_ADMIN_PASSWORD" "$AUTH_TENANT_ADMIN_PASSWORD"
set_env_value "REDIS_HOST" "$REDIS_SERVICE_HOST"
set_env_value "REDIS_PORT" "$REDIS_SERVICE_PORT"
set_env_value "REDIS_PASSWORD" "$REDIS_SERVICE_PASSWORD"
set_env_value "REDIS_DB" "$REDIS_SERVICE_DB"
set_env_value "REDIS_TLS" "$REDIS_SERVICE_TLS"
set_env_value "QUEUE_ENABLED" "$QUEUE_RUNTIME_ENABLED"
set_env_value "DATABASE_BACKUP_INTERVAL_HOURS" "$DATABASE_BACKUP_INTERVAL"
set_env_value "INSTALL_RUN_TESTS" "$INSTALL_RUN_TESTS"
set_env_value "HEALTH_WAIT_SECONDS" "$HEALTH_WAIT_SECONDS"

export PORT="$SERVER_PORT"
export VITE_PORT="$FRONTEND_PORT"
export VITE_API_BASE_URL="$API_BASE_URL"
export FRONTEND_URL="$FRONTEND_APP_URL"
export CORS_ORIGINS="$CORS_ALLOWED_ORIGINS"
export ELECTRON_DEV_SERVER_URL="$FRONTEND_APP_URL"
export EXPO_PUBLIC_API_URL="${API_BASE_URL}/api"
export DB_HOST="$DATABASE_HOST"
export DB_PORT="$DATABASE_PORT"
export DB_NAME="$DATABASE_NAME"
export DB_USER="$DATABASE_USER"
export DB_PASSWORD="$DATABASE_PASSWORD"
export JWT_SECRET="$AUTH_JWT_SECRET"
export SUPER_ADMIN_NAME="$AUTH_SUPER_ADMIN_NAME"
export SUPER_ADMIN_EMAIL="$AUTH_SUPER_ADMIN_EMAIL"
export SUPER_ADMIN_PASSWORD="$AUTH_SUPER_ADMIN_PASSWORD"
export SOFTWARE_ADMIN_NAME="$AUTH_SOFTWARE_ADMIN_NAME"
export SOFTWARE_ADMIN_EMAIL="$AUTH_SOFTWARE_ADMIN_EMAIL"
export SOFTWARE_ADMIN_PASSWORD="$AUTH_SOFTWARE_ADMIN_PASSWORD"
export TENANT_ADMIN_NAME="$AUTH_TENANT_ADMIN_NAME"
export TENANT_ADMIN_EMAIL="$AUTH_TENANT_ADMIN_EMAIL"
export TENANT_ADMIN_PASSWORD="$AUTH_TENANT_ADMIN_PASSWORD"
export REDIS_HOST="$REDIS_SERVICE_HOST"
export REDIS_PORT="$REDIS_SERVICE_PORT"
export REDIS_PASSWORD="$REDIS_SERVICE_PASSWORD"
export REDIS_DB="$REDIS_SERVICE_DB"
export REDIS_TLS="$REDIS_SERVICE_TLS"
export QUEUE_ENABLED="$QUEUE_RUNTIME_ENABLED"
export DATABASE_BACKUP_INTERVAL_HOURS="$DATABASE_BACKUP_INTERVAL"
export INSTALL_RUN_TESTS="$INSTALL_RUN_TESTS"
export HEALTH_WAIT_SECONDS="$HEALTH_WAIT_SECONDS"

echo "Configured ports: backend=$SERVER_PORT frontend=$FRONTEND_PORT api=$API_BASE_URL"
echo "Configured services: db=$DB_HOST:$DB_PORT redis=$REDIS_HOST:$REDIS_PORT"
echo "Install tests: $INSTALL_RUN_TESTS"
echo "Health wait limit: ${HEALTH_WAIT_SECONDS}s"

log_step "Waiting for MariaDB at $DB_HOST:$DB_PORT"
for attempt in $(seq 1 60); do
  if mysqladmin ping \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --silent >/dev/null 2>&1; then
    echo "MariaDB is reachable"
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "MariaDB was not reachable after waiting." >&2
    exit 1
  fi

  sleep 2
done

if [ "$QUEUE_RUNTIME_ENABLED" != "false" ]; then
  log_step "Waiting for Redis at $REDIS_HOST:$REDIS_PORT"
  for attempt in $(seq 1 "$HEALTH_WAIT_SECONDS"); do
    if timeout 2 bash -c "cat < /dev/null > /dev/tcp/$REDIS_HOST/$REDIS_PORT" >/dev/null 2>&1; then
      echo "Redis port is reachable"
      break
    fi

    if [ "$attempt" -eq "$HEALTH_WAIT_SECONDS" ]; then
      echo "Redis was not reachable after waiting. Queue workers will fall back to MariaDB only." >&2
      break
    fi

    sleep 1
  done
fi

log_step "Installing dependencies"
if [ -f package-lock.json ]; then
  npm ci --no-audit --fund=false
else
  npm install --no-audit --fund=false
fi

log_step "Running database setup"
npm -w apps/server run db:setup

if [ "$INSTALL_RUN_TESTS" = "true" ]; then
  log_step "Running tenant safety tests"
  npm run test:tenant-static
  npm run test:tenant-isolation
else
  log_step "Skipping tenant safety tests during install"
fi

log_step "Cleaning previous build output"
rm -rf build apps/server/dist apps/frontend/dist

log_step "Building CXSun"
npm run build:active

log_step "Starting backend on port $SERVER_PORT"
PORT="$SERVER_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/server run start &
SERVER_PID="$!"

log_step "Starting frontend preview on port $FRONTEND_PORT"
VITE_PORT="$FRONTEND_PORT" npm -w apps/frontend run preview -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID="$!"

shutdown() {
  echo "Stopping CXSun processes"
  kill "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null || true
}

log_step "Waiting for backend health"
HEALTH_ATTEMPTS=$((HEALTH_WAIT_SECONDS / 2))
if [ "$HEALTH_ATTEMPTS" -lt 1 ]; then
  HEALTH_ATTEMPTS=1
fi

for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS "http://127.0.0.1:${SERVER_PORT}/health" >/dev/null 2>&1; then
    echo "Backend health passed"
    break
  fi

  if [ "$attempt" -eq "$HEALTH_ATTEMPTS" ]; then
    echo "Backend health failed after ${HEALTH_WAIT_SECONDS}s" >&2
    shutdown
    exit 1
  fi

  sleep 2
done

log_step "Checking strict tenant resolver"
curl -fsS "http://127.0.0.1:${SERVER_PORT}/api/site/tenant-static?domain=codexsun.com" | grep -q '"resolved":true'
echo "Tenant resolver passed"

trap shutdown INT TERM

wait -n "$SERVER_PID" "$FRONTEND_PID"
shutdown
