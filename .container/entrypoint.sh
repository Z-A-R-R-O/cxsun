#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/workspace/cxsun}"
GIT_BRANCH="${GIT_BRANCH:-main}"
FRONTEND_PORT="${VITE_PORT:-6010}"
SERVER_PORT="${PORT:-6001}"
API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:${SERVER_PORT}}"
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"

mkdir -p "$(dirname "$APP_DIR")"

if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  echo "Cloning $GIT_REPO_URL branch $GIT_BRANCH into $APP_DIR"
  git clone --branch "$GIT_BRANCH" "$GIT_REPO_URL" "$APP_DIR"
else
  echo "Using existing repository at $APP_DIR"
fi

cd "$APP_DIR"

if [ "${GIT_PULL_ON_START:-false}" = "true" ]; then
  echo "Pulling latest changes for $GIT_BRANCH"
  git fetch origin "$GIT_BRANCH"
  git pull --ff-only origin "$GIT_BRANCH"
fi

if [ ! -f .env ] && [ -f .env.sample ]; then
  echo "Creating .env from .env.sample"
  cp .env.sample .env
fi

set_env_value() {
  key="$1"
  value="$2"

  if [ ! -f .env ]; then
    touch .env
  fi

  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env_value "PORT" "$SERVER_PORT"
set_env_value "VITE_PORT" "$FRONTEND_PORT"
set_env_value "VITE_API_BASE_URL" "$API_BASE_URL"
set_env_value "ELECTRON_DEV_SERVER_URL" "http://localhost:${FRONTEND_PORT}"
set_env_value "EXPO_PUBLIC_API_URL" "${API_BASE_URL}/api"
set_env_value "DB_HOST" "${DB_HOST:-postgres}"
set_env_value "DB_PORT" "${DB_PORT:-5432}"
set_env_value "DB_NAME" "${DB_NAME:-codexsun_db}"
set_env_value "DB_USER" "${DB_USER:-codexsun}"
set_env_value "DB_PASSWORD" "${DB_PASSWORD:-DbPass1@@}"
set_env_value "REDIS_HOST" "${REDIS_HOST:-redis}"
set_env_value "REDIS_PORT" "${REDIS_PORT:-6379}"

export PORT="$SERVER_PORT"
export VITE_PORT="$FRONTEND_PORT"
export VITE_API_BASE_URL="$API_BASE_URL"
export ELECTRON_DEV_SERVER_URL="http://localhost:${FRONTEND_PORT}"
export EXPO_PUBLIC_API_URL="${API_BASE_URL}/api"
export DB_HOST="${DB_HOST:-postgres}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-codexsun_db}"
export DB_USER="${DB_USER:-codexsun}"
export DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"

echo "Configured ports: backend=$SERVER_PORT frontend=$FRONTEND_PORT api=$API_BASE_URL"
echo "Configured services: db=$DB_HOST:$DB_PORT redis=$REDIS_HOST:$REDIS_PORT"

echo "Installing dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Building CXSun"
npm run build:active

echo "Starting backend on port $SERVER_PORT"
PORT="$SERVER_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/server run start &
SERVER_PID="$!"

echo "Starting frontend preview on port $FRONTEND_PORT"
VITE_PORT="$FRONTEND_PORT" npm -w apps/frontend run preview -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID="$!"

shutdown() {
  echo "Stopping CXSun processes"
  kill "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap shutdown INT TERM

wait -n "$SERVER_PID" "$FRONTEND_PID"
shutdown
