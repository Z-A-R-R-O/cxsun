#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"

echo "Using compose file: $COMPOSE_FILE"
echo "Repository: $GIT_REPO_URL"
echo "Branch: ${GIT_BRANCH:-main}"
echo "Backend port: ${PORT:-6001}"
echo "Frontend port: ${VITE_PORT:-6010}"

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

echo "Building Docker image cxsun:v1"
docker compose -f "$COMPOSE_FILE" build

echo "Starting CXSun"
docker compose -f "$COMPOSE_FILE" up -d

echo "Current status"
docker compose -f "$COMPOSE_FILE" ps

echo "Recent logs"
docker compose -f "$COMPOSE_FILE" logs --tail=80 cxsun

echo "Deploy complete."
echo "Backend: http://localhost:${PORT:-6001}"
echo "Frontend: http://localhost:${VITE_PORT:-6010}"
