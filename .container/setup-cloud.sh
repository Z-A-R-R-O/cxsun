#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRESH_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --fresh|--reinstall)
      FRESH_INSTALL=true
      ;;
    -h|--help)
      echo "Usage: .container/setup-cloud.sh [--fresh|--reinstall]"
      echo "  --fresh, --reinstall  Remove and recreate the CXSun app workspace and Redis container/cache. MariaDB is never touched."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: .container/setup-cloud.sh [--fresh|--reinstall]" >&2
      exit 1
      ;;
  esac
done

export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
export GIT_BRANCH="${GIT_BRANCH:-main}"
export GIT_PULL_ON_START="${GIT_PULL_ON_START:-false}"
export PORT="${PORT:-6005}"
export VITE_PORT="${VITE_PORT:-6010}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://codexsun.com}"
export VITE_STORAGE_BASE_URL="${VITE_STORAGE_BASE_URL:-$VITE_API_BASE_URL}"
export FRONTEND_URL="${FRONTEND_URL:-https://codexsun.com}"
export CORS_ORIGINS="${CORS_ORIGINS:-https://codexsun.com,https://www.codexsun.com}"
export DB_HOST="${DB_HOST:-mariadb}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-cxsun_master}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
export JWT_SECRET="${JWT_SECRET:-}"
export SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-SUNDAR}"
export SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-sundar@sundar.com}"
export SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Kalarani1@@}"
export SOFTWARE_ADMIN_NAME="${SOFTWARE_ADMIN_NAME:-Admin}"
export SOFTWARE_ADMIN_EMAIL="${SOFTWARE_ADMIN_EMAIL:-admin@admin.com}"
export SOFTWARE_ADMIN_PASSWORD="${SOFTWARE_ADMIN_PASSWORD:-Admin@123}"
export TENANT_ADMIN_NAME="${TENANT_ADMIN_NAME:-ADMIN}"
export TENANT_ADMIN_EMAIL="${TENANT_ADMIN_EMAIL:-admin@tenant.com}"
export TENANT_ADMIN_PASSWORD="${TENANT_ADMIN_PASSWORD:-admin@123}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export REDIS_DB="${REDIS_DB:-0}"
export REDIS_TLS="${REDIS_TLS:-false}"
export REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-redis}"
export REDIS_IMAGE="${REDIS_IMAGE:-redis:7.4-alpine}"
export REDIS_HOST_PORT="${REDIS_HOST_PORT:-6380}"
export CXMEDIA_STORAGE_VOLUME="${CXMEDIA_STORAGE_VOLUME:-cxmedia-storage}"
export CXMEDIA_DB_VOLUME="${CXMEDIA_DB_VOLUME:-cxmedia-db}"
export CXMEDIA_PORT="${CXMEDIA_PORT:-6050}"
export CXMEDIA_ADMIN_PASSWORD="${CXMEDIA_ADMIN_PASSWORD:-Admin@12345}"
export VITE_MEDIA_MANAGER_URL="${VITE_MEDIA_MANAGER_URL:-http://localhost:${CXMEDIA_PORT}}"
export INSTALL_RUN_TESTS="${INSTALL_RUN_TESTS:-false}"
export SKIP_MARIADB_WAIT="${SKIP_MARIADB_WAIT:-true}"
export HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-900}"

echo "Using compose file: $COMPOSE_FILE"
echo "Repository: $GIT_REPO_URL"
echo "Branch: $GIT_BRANCH"
echo "Public URL: $FRONTEND_URL"
echo "API URL: $VITE_API_BASE_URL"
echo "Storage URL: $VITE_STORAGE_BASE_URL"
echo "Media manager URL: $VITE_MEDIA_MANAGER_URL"
echo "Backend port: $PORT"
echo "Frontend port: $VITE_PORT"
echo "CXMedia port: $CXMEDIA_PORT"
echo "CXMedia user: admin"
echo "MariaDB: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo "Media storage volume: $CXMEDIA_STORAGE_VOLUME"
echo "Fresh reinstall: $FRESH_INSTALL"
echo "Install tests: $INSTALL_RUN_TESTS"
echo "MariaDB preflight wait skipped: $SKIP_MARIADB_WAIT"
echo "Health wait limit: ${HEALTH_WAIT_SECONDS}s"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 48
    return
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
    return
  fi

  date +%s%N | sha256sum | awk '{print $1}'
}

if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="$(generate_secret)"
  echo "Generated JWT_SECRET for this deployment."
else
  echo "Using JWT_SECRET from environment."
fi

if [ -n "$SUPER_ADMIN_EMAIL" ] && [ -n "$SUPER_ADMIN_PASSWORD" ]; then
  echo "Super admin seed is configured from environment."
else
  echo "Super admin seed is not configured. No hardcoded super admin will be created."
fi

if [ -n "$SOFTWARE_ADMIN_EMAIL" ] && [ -n "$SOFTWARE_ADMIN_PASSWORD" ]; then
  echo "Software admin seed is configured from environment."
else
  echo "Software admin seed is not configured."
fi

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

if docker ps -a --format '{{.Names}}' | grep -Fx "$DB_HOST" >/dev/null 2>&1; then
  echo "Connecting MariaDB container $DB_HOST to codexion-network when needed"
  docker network connect codexion-network "$DB_HOST" >/dev/null 2>&1 || true
fi

reset_external_redis() {
  echo "Resetting external Redis container: $REDIS_CONTAINER_NAME"
  docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker volume rm "${REDIS_CONTAINER_NAME}_data" >/dev/null 2>&1 || true
  docker volume rm redis_data >/dev/null 2>&1 || true
}

start_external_redis() {
  if docker ps --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "External Redis container already running: $REDIS_CONTAINER_NAME"
    docker network connect codexion-network "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Starting existing external Redis container: $REDIS_CONTAINER_NAME"
    docker start "$REDIS_CONTAINER_NAME" >/dev/null
    docker network connect codexion-network "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    return
  fi

  echo "Creating external Redis container: $REDIS_CONTAINER_NAME"
  if [ -n "$REDIS_PASSWORD" ]; then
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --network codexion-network \
      --restart unless-stopped \
      -p "${REDIS_HOST_PORT}:6379" \
      -v "${REDIS_CONTAINER_NAME}_data:/data" \
      "$REDIS_IMAGE" redis-server --appendonly yes --requirepass "$REDIS_PASSWORD" >/dev/null
  else
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --network codexion-network \
      --restart unless-stopped \
      -p "${REDIS_HOST_PORT}:6379" \
      -v "${REDIS_CONTAINER_NAME}_data:/data" \
      "$REDIS_IMAGE" redis-server --appendonly yes >/dev/null
  fi
}

wait_external_redis() {
  echo "Waiting for Redis at $REDIS_CONTAINER_NAME:6379"

  for attempt in $(seq 1 60); do
    if [ -n "$REDIS_PASSWORD" ]; then
      if docker exec "$REDIS_CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
        echo "Redis is reachable"
        return
      fi
    else
      if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG; then
        echo "Redis is reachable"
        return
      fi
    fi

    if [ "$attempt" -eq 60 ]; then
      echo "Redis was not reachable after waiting." >&2
      docker logs --tail=80 "$REDIS_CONTAINER_NAME" || true
      exit 1
    fi

    sleep 1
  done
}

cleanup_legacy_media_containers() {
  docker rm -f cxsun-storage-cdn >/dev/null 2>&1 || true
  docker rm -f cxsun-storage-browser >/dev/null 2>&1 || true
}

reset_cxmedia_admin_password() {
  if ! docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    return
  fi

  echo "Ensuring CXMedia admin password"
  docker exec cxmedia filebrowser users update admin --password "$CXMEDIA_ADMIN_PASSWORD" --database /database/filebrowser.db >/dev/null 2>&1 || true
}

ensure_cxmedia() {
  docker volume create "$CXMEDIA_STORAGE_VOLUME" >/dev/null
  docker volume create "$CXMEDIA_DB_VOLUME" >/dev/null
  cleanup_legacy_media_containers

  if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    echo "CXMedia already running: cxmedia"
    docker network connect codexion-network cxmedia >/dev/null 2>&1 || true
    reset_cxmedia_admin_password
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    echo "Starting existing CXMedia container: cxmedia"
    docker start cxmedia >/dev/null
    docker network connect codexion-network cxmedia >/dev/null 2>&1 || true
    reset_cxmedia_admin_password
    return
  fi

  echo "Installing CXMedia container: cxmedia"
  docker compose -f "$COMPOSE_FILE" up -d --no-deps cxmedia
  reset_cxmedia_admin_password
  echo "CXMedia default login: admin / $CXMEDIA_ADMIN_PASSWORD"
}

STORAGE_BACKUP_DIR=""

backup_existing_storage() {
  if ! docker ps -a --format '{{.Names}}' | grep -Fx cxsun >/dev/null 2>&1; then
    return
  fi

  STORAGE_BACKUP_DIR="$(mktemp -d)"
  echo "Preserving existing uploaded storage before container recreate"
  if docker cp cxsun:/workspace/cxsun/storage/. "$STORAGE_BACKUP_DIR" >/dev/null 2>&1; then
    echo "Storage copied to temporary backup."
  else
    echo "No existing container storage could be copied; continuing."
    rm -rf "$STORAGE_BACKUP_DIR"
    STORAGE_BACKUP_DIR=""
  fi
}

restore_storage_volume() {
  docker volume create "$CXMEDIA_STORAGE_VOLUME" >/dev/null

  if [ -z "$STORAGE_BACKUP_DIR" ] || [ ! -d "$STORAGE_BACKUP_DIR" ]; then
    migrate_legacy_storage_volume
    return
  fi

  echo "Restoring uploaded storage into persistent volume: $CXMEDIA_STORAGE_VOLUME"
  docker run --rm \
    -v "$CXMEDIA_STORAGE_VOLUME:/target" \
    -v "$STORAGE_BACKUP_DIR:/source:ro" \
    cxsun:v1 \
    bash -lc "mkdir -p /target && cp -a /source/. /target/ 2>/dev/null || true" >/dev/null
}

migrate_legacy_storage_volume() {
  if [ "$CXMEDIA_STORAGE_VOLUME" = "cxsun-storage" ]; then
    return
  fi

  if ! docker volume inspect cxsun-storage >/dev/null 2>&1; then
    return
  fi

  echo "Migrating legacy cxsun-storage volume into $CXMEDIA_STORAGE_VOLUME"
  docker run --rm \
    -v "$CXMEDIA_STORAGE_VOLUME:/target" \
    -v cxsun-storage:/source:ro \
    cxsun:v1 \
    bash -lc "mkdir -p /target && cp -an /source/. /target/ 2>/dev/null || true" >/dev/null
}

cleanup_storage_backup() {
  if [ -n "$STORAGE_BACKUP_DIR" ]; then
    rm -rf "$STORAGE_BACKUP_DIR" >/dev/null 2>&1 || true
  fi
}

seed_workspace_volume() {
  docker volume create cxsun-volume >/dev/null

  echo "Seeding app workspace volume from local repository"
  docker run --rm \
    -v cxsun-volume:/target \
    -v "$REPOSITORY_ROOT:/source:ro" \
    cxsun:v1 \
    bash -lc "set -e
      mkdir -p /target/cxsun
      find /target/cxsun -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
      tar -C /source \
        --exclude='./node_modules' \
        --exclude='./build' \
        --exclude='./storage' \
        --exclude='./apps/server/dist' \
        --exclude='./apps/frontend/dist' \
        --exclude='./apps/web/dist' \
        -cf - . | tar -C /target/cxsun -xf -
    " >/dev/null
}

if [ "$FRESH_INSTALL" = "true" ]; then
  reset_external_redis
fi

export REDIS_HOST="$REDIS_CONTAINER_NAME"
export REDIS_PORT="6379"
echo "Using Redis container at $REDIS_HOST:$REDIS_PORT"
start_external_redis
wait_external_redis
backup_existing_storage

echo "Stopping existing CXSun container"
docker compose -f "$COMPOSE_FILE" stop cxsun >/dev/null 2>&1 || true
docker compose -f "$COMPOSE_FILE" rm -f cxsun >/dev/null 2>&1 || true
docker stop cxsun >/dev/null 2>&1 || true

echo "Removing existing CXSun container"
docker rm cxsun >/dev/null 2>&1 || true

if [ "$FRESH_INSTALL" = "true" ]; then
  echo "Clean app reinstall requested: removing CXSun workspace volumes only"
  docker volume rm cxsun-volume >/dev/null 2>&1 || true
  docker volume rm cxsun_cxsun-workspace >/dev/null 2>&1 || true
  echo "MariaDB is preserved and not touched by this script"
fi

echo "Building Docker image cxsun:v1"
if [ "$FRESH_INSTALL" = "true" ]; then
  docker compose -f "$COMPOSE_FILE" build --no-cache cxsun
else
  docker compose -f "$COMPOSE_FILE" build cxsun
fi
restore_storage_volume
cleanup_storage_backup
seed_workspace_volume
ensure_cxmedia

echo "Starting CXSun"
docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps cxsun

echo "Waiting for backend health"
LOG_FOLLOW_PID=""
cleanup_log_follow() {
  if [ -n "$LOG_FOLLOW_PID" ]; then
    kill "$LOG_FOLLOW_PID" >/dev/null 2>&1 || true
    wait "$LOG_FOLLOW_PID" >/dev/null 2>&1 || true
  fi
}
docker compose -f "$COMPOSE_FILE" logs -f --tail=80 cxsun &
LOG_FOLLOW_PID="$!"
trap cleanup_log_follow EXIT

HEALTH_ATTEMPTS=$((HEALTH_WAIT_SECONDS / 5))
if [ "$HEALTH_ATTEMPTS" -lt 1 ]; then
  HEALTH_ATTEMPTS=1
fi

for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if docker compose -f "$COMPOSE_FILE" exec -T cxsun bash -lc "curl -fsS http://127.0.0.1:${PORT}/health >/dev/null" >/dev/null 2>&1; then
    cleanup_log_follow
    LOG_FOLLOW_PID=""
    echo "Backend health check passed."
    break
  fi

  if [ "$attempt" -eq "$HEALTH_ATTEMPTS" ]; then
    cleanup_log_follow
    LOG_FOLLOW_PID=""
    echo "Backend health check failed after ${HEALTH_WAIT_SECONDS}s." >&2
    docker compose -f "$COMPOSE_FILE" logs --tail=160 cxsun || true
    exit 1
  fi

  sleep 5
done

echo "Checking tenant static resolver"
docker compose -f "$COMPOSE_FILE" exec -T cxsun bash -lc "curl -fsS 'http://127.0.0.1:${PORT}/api/site/tenant-static?domain=codexsun.com' | grep -q '\"resolved\":true'"

echo "Current status"
docker compose -f "$COMPOSE_FILE" ps

echo "Recent logs"
docker compose -f "$COMPOSE_FILE" logs --tail=80 cxsun

echo "Cloud deploy complete."
echo "Backend: $VITE_API_BASE_URL"
echo "Frontend: $FRONTEND_URL"
echo "Storage URL: ${VITE_STORAGE_BASE_URL}"
echo "CXMedia: ${VITE_MEDIA_MANAGER_URL}"
