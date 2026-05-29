#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
CLEAN_INSTALL=false
WIPE_MEDIA=false

for arg in "$@"; do
  case "$arg" in
    --clean|--fresh|--reinstall)
      CLEAN_INSTALL=true
      ;;
    --wipe-media)
      WIPE_MEDIA=true
      ;;
    -h|--help)
      echo "Usage: .container/setup-media.sh [--reinstall] [--wipe-media]"
      echo "  --reinstall   Stop/remove cxmedia and recreate the File Browser DB volume. Media files are preserved."
      echo "  --wipe-media  Also remove uploaded media volume. Use only when you intentionally want a clean media store."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: .container/setup-media.sh [--reinstall] [--wipe-media]" >&2
      exit 1
      ;;
  esac
done

export CXMEDIA_STORAGE_VOLUME="${CXMEDIA_STORAGE_VOLUME:-cxmedia-storage}"
export CXMEDIA_DB_VOLUME="${CXMEDIA_DB_VOLUME:-cxmedia-db}"
export CXMEDIA_PORT="${CXMEDIA_PORT:-6050}"
export CXMEDIA_ADMIN_PASSWORD="${CXMEDIA_ADMIN_PASSWORD:-Sundarcomputers@123}"

CXMEDIA_WAS_STARTED=false

start_existing_cxmedia_if_needed() {
  if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    docker start cxmedia >/dev/null 2>&1 || true
  fi
}

cleanup_on_error() {
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    echo "CXMedia setup failed. Attempting to leave existing container running." >&2
    start_existing_cxmedia_if_needed
  fi
}
trap cleanup_on_error EXIT

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not reachable. Start Docker and rerun setup-media." >&2
  exit 1
fi

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

echo "Removing old temporary media containers when present"
docker rm -f cxsun-storage-cdn >/dev/null 2>&1 || true
docker rm -f cxsun-storage-browser >/dev/null 2>&1 || true

if [ "$CLEAN_INSTALL" = "true" ]; then
  echo "Clean CXMedia reinstall requested"
  docker rm -f cxmedia >/dev/null 2>&1 || true
  docker volume rm "$CXMEDIA_DB_VOLUME" >/dev/null 2>&1 || true

  if [ "$WIPE_MEDIA" = "true" ]; then
    echo "Removing uploaded media volume: $CXMEDIA_STORAGE_VOLUME"
    docker volume rm "$CXMEDIA_STORAGE_VOLUME" >/dev/null 2>&1 || true
  else
    echo "Preserving uploaded media volume: $CXMEDIA_STORAGE_VOLUME"
  fi
fi

echo "Ensuring CXMedia volumes"
docker volume create "$CXMEDIA_STORAGE_VOLUME" >/dev/null
docker volume create "$CXMEDIA_DB_VOLUME" >/dev/null

if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "Stopping CXMedia for database maintenance"
  docker stop cxmedia >/dev/null
  CXMEDIA_WAS_STARTED=true
elif docker ps -a --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "CXMedia container exists and is stopped"
else
  echo "Creating CXMedia container"
  docker compose -f "$COMPOSE_FILE" create cxmedia >/dev/null
fi

echo "Ensuring CXMedia admin user"
docker run --rm \
  --entrypoint sh \
  -e CXMEDIA_ADMIN_PASSWORD="$CXMEDIA_ADMIN_PASSWORD" \
  -v "$CXMEDIA_DB_VOLUME:/database" \
  -v "$CXMEDIA_STORAGE_VOLUME:/srv" \
  filebrowser/filebrowser:v2.63.5 \
  -lc "mkdir -p /srv && filebrowser config init --database /database/filebrowser.db >/dev/null 2>&1 || true"
docker run --rm \
  --entrypoint sh \
  -e CXMEDIA_ADMIN_PASSWORD="$CXMEDIA_ADMIN_PASSWORD" \
  -v "$CXMEDIA_DB_VOLUME:/database" \
  -v "$CXMEDIA_STORAGE_VOLUME:/srv" \
  filebrowser/filebrowser:v2.63.5 \
  -lc "mkdir -p /srv && filebrowser users update admin \
    --password \"\$CXMEDIA_ADMIN_PASSWORD\" \
    --scope /srv \
    --perm.admin \
    --perm.create \
    --perm.delete \
    --perm.download \
    --perm.modify \
    --perm.rename \
    --perm.share \
    --database /database/filebrowser.db >/dev/null 2>&1 \
  || filebrowser users add admin \"\$CXMEDIA_ADMIN_PASSWORD\" \
      --scope /srv \
      --perm.admin \
      --perm.create \
      --perm.delete \
      --perm.download \
      --perm.modify \
      --perm.rename \
      --perm.share \
      --database /database/filebrowser.db >/dev/null"

echo "Starting CXMedia"
docker start cxmedia >/dev/null
docker network connect codexion-network cxmedia >/dev/null 2>&1 || true

echo "Checking CXMedia container status"
for attempt in $(seq 1 20); do
  if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 20 ]; then
    echo "CXMedia did not stay running." >&2
    docker logs --tail=80 cxmedia || true
    exit 1
  fi

  sleep 1
done

echo "CXMedia ready."
echo "URL: http://localhost:${CXMEDIA_PORT}"
echo "Login: admin / $CXMEDIA_ADMIN_PASSWORD"
