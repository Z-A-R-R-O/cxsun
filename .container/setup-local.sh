#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
REDIS_COMPOSE_FILE="$SCRIPT_DIR/database/redis.yml"
export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:${PORT:-6005}}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:${VITE_PORT:-6010}}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:${VITE_PORT:-6010},https://localhost:${VITE_PORT:-6010}}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export REDIS_DB="${REDIS_DB:-0}"
export REDIS_TLS="${REDIS_TLS:-false}"

echo "Using compose file: $COMPOSE_FILE"
echo "Repository: $GIT_REPO_URL"
echo "Branch: ${GIT_BRANCH:-main}"
echo "Backend port: ${PORT:-6005}"
echo "Frontend port: ${VITE_PORT:-6010}"
echo "Redis: $REDIS_HOST:$REDIS_PORT"

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

echo "Stopping existing CXSun container"
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
docker stop cxsun >/dev/null 2>&1 || true

echo "Removing existing CXSun container"
docker rm cxsun >/dev/null 2>&1 || true

echo "Removing CXSun workspace volumes"
docker volume rm cxsun-volume >/dev/null 2>&1 || true
docker volume rm cxsun_cxsun-workspace >/dev/null 2>&1 || true

echo "Starting Redis"
docker compose -f "$REDIS_COMPOSE_FILE" up -d

echo "Building Docker image cxsun:v1"
docker compose -f "$COMPOSE_FILE" build

echo "Starting CXSun"
docker compose -f "$COMPOSE_FILE" up -d

echo "Current status"
docker compose -f "$COMPOSE_FILE" ps

echo "Recent logs"
docker compose -f "$COMPOSE_FILE" logs --tail=80 cxsun

echo "Deploy complete."
echo "Backend: ${VITE_API_BASE_URL}"
echo "Frontend: ${FRONTEND_URL}"
