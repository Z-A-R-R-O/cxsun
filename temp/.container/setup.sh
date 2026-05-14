#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CLIENT_NAME="${CLIENT:-${client:-${1:-}}}"
MARIADB_CONTAINER_NAME="${MARIADB_CONTAINER_NAME:-mariadb}"
NETWORK_NAME="${NETWORK_NAME:-codexion-network}"
CLIENT_ROOT="$SCRIPT_DIR/client"
CLIENT_COMPOSE_FILE="$CLIENT_ROOT/docker-compose.yml"

if [ -z "$CLIENT_NAME" ]; then
  echo "Usage: ./.container/setup.sh <client>"
  echo "Example: ./.container/setup.sh codexsun"
  exit 1
fi

SELECTED_ENV_FILE="$CLIENT_ROOT/$CLIENT_NAME/client.env"

if [ ! -f "$SELECTED_ENV_FILE" ]; then
  echo "Unknown client '$CLIENT_NAME'. Expected one of:"
  for candidate_env in "$CLIENT_ROOT"/*/client.env; do
    [ -f "$candidate_env" ] || continue
    basename "$(dirname "$candidate_env")"
  done
  exit 1
fi

set -a
. "$SELECTED_ENV_FILE"
set +a

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' is not installed."
    exit 1
  fi
}

require_command docker
require_command curl

compose() {
  CLIENT_ENV_FILE="$SELECTED_ENV_FILE" DEPLOY_SOURCE="$REPO_ROOT" \
    docker compose --env-file "$SELECTED_ENV_FILE" -f "$CLIENT_COMPOSE_FILE" "$@"
}

ensure_network() {
  docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true
}

ensure_mariadb() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$MARIADB_CONTAINER_NAME"; then
    docker compose -f "$SCRIPT_DIR/mariadb.yml" up -d
  fi

  i=0
  until docker exec "$MARIADB_CONTAINER_NAME" mariadb-admin -uroot -p"$DB_PASSWORD" ping --silent >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      echo "MariaDB did not become ready in time."
      exit 1
    fi
    sleep 2
  done
}

create_database_if_missing() {
  docker exec "$MARIADB_CONTAINER_NAME" mariadb -uroot -p"$DB_PASSWORD" -e \
    "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

start_client() {
  legacy_container_name="cxnext-$APP_NAME-app"
  if [ "$legacy_container_name" != "$APP_CONTAINER_NAME" ] &&
    docker ps -a --format '{{.Names}}' | grep -qx "$legacy_container_name"; then
    docker rm -f "$legacy_container_name" >/dev/null
  fi

  compose up -d --build app
}

prepare_database() {
  compose exec -T app pnpm db:prepare
}

smoke_test() {
  compose exec -T app pnpm smoke:test
}

test_http_endpoint() {
  url="$1"
  curl --fail --silent --show-error --location "$url" >/dev/null
}

wait_for_http() {
  url="$1"
  attempts="${2:-30}"
  delay="${3:-2}"
  i=0

  until test_http_endpoint "$url"; do
    i=$((i + 1))
    if [ "$i" -ge "$attempts" ]; then
      echo "HTTP endpoint did not become ready: $url"
      exit 1
    fi
    sleep "$delay"
  done
}

ensure_network
ensure_mariadb
create_database_if_missing
start_client
prepare_database

wait_for_http "http://127.0.0.1:$APP_PUBLIC_PORT/health"
wait_for_http "http://127.0.0.1:$FRONTEND_PUBLIC_PORT"

if [ "${SMOKE_TEST_ENABLED:-false}" = "true" ]; then
  smoke_test
fi

cat <<EOF
Client '$CLIENT_NAME' is ready.

Direct frontend: http://127.0.0.1:$FRONTEND_PUBLIC_PORT
Direct API health: http://127.0.0.1:$APP_PUBLIC_PORT/health
Public API base: ${NEXT_PUBLIC_API_URL:-}

Compose file: $COMPOSE_FILE
Container: $APP_CONTAINER_NAME
Database: $DB_NAME
EOF
