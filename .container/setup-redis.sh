#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-start}"
REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-redis}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:7.4-alpine}"
REDIS_HOST_PORT="${REDIS_HOST_PORT:-6380}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_NETWORK="${REDIS_NETWORK:-codexion-network}"
REDIS_VOLUME="${REDIS_VOLUME:-${REDIS_CONTAINER_NAME}_data}"

usage() {
  cat <<'EOF'
Usage: .container/setup-redis.sh [start|stop|restart|reinstall|status]

Actions:
  start      Create or start Redis on the configured Docker network and wait for PONG.
  stop       Stop Redis without deleting its container or data volume.
  restart    Stop Redis, then start it again with the same data volume.
  reinstall  Remove Redis container and data volume, then create a clean Redis on the same ports.
  status     Print Redis container status and ping result.

Environment:
  REDIS_CONTAINER_NAME  Container name, default redis
  REDIS_IMAGE           Image, default redis:7.4-alpine
  REDIS_HOST_PORT       Host port mapped to container 6379, default 6380
  REDIS_PASSWORD        Optional Redis password
  REDIS_NETWORK         Docker network, default codexion-network
  REDIS_VOLUME          Data volume, default <container>_data
EOF
}

ensure_network() {
  if ! docker network inspect "$REDIS_NETWORK" >/dev/null 2>&1; then
    echo "Creating Docker network $REDIS_NETWORK"
    docker network create "$REDIS_NETWORK" >/dev/null
  fi
}

redis_ping() {
  if [ -n "$REDIS_PASSWORD" ]; then
    docker exec "$REDIS_CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG
  else
    docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG
  fi
}

wait_redis() {
  echo "Waiting for Redis at $REDIS_CONTAINER_NAME:6379"

  for attempt in $(seq 1 60); do
    if redis_ping; then
      echo "Redis is reachable"
      return
    fi

    if [ "$attempt" -eq 60 ]; then
      echo "Redis was not reachable after waiting." >&2
      docker logs --tail=80 "$REDIS_CONTAINER_NAME" || true
      exit 1
    fi

    sleep 1
  done
}

start_redis() {
  ensure_network

  if docker ps --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Redis container already running: $REDIS_CONTAINER_NAME"
    docker network connect "$REDIS_NETWORK" "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    wait_redis
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Starting existing Redis container: $REDIS_CONTAINER_NAME"
    docker start "$REDIS_CONTAINER_NAME" >/dev/null
    docker network connect "$REDIS_NETWORK" "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    wait_redis
    return
  fi

  echo "Creating Redis container: $REDIS_CONTAINER_NAME"
  if [ -n "$REDIS_PASSWORD" ]; then
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --network "$REDIS_NETWORK" \
      --restart unless-stopped \
      -p "${REDIS_HOST_PORT}:6379" \
      -v "${REDIS_VOLUME}:/data" \
      "$REDIS_IMAGE" redis-server --appendonly yes --requirepass "$REDIS_PASSWORD" >/dev/null
  else
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --network "$REDIS_NETWORK" \
      --restart unless-stopped \
      -p "${REDIS_HOST_PORT}:6379" \
      -v "${REDIS_VOLUME}:/data" \
      "$REDIS_IMAGE" redis-server --appendonly yes >/dev/null
  fi

  wait_redis
}

stop_redis() {
  if docker ps --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Stopping Redis container: $REDIS_CONTAINER_NAME"
    docker stop "$REDIS_CONTAINER_NAME" >/dev/null
    return
  fi

  echo "Redis container is not running: $REDIS_CONTAINER_NAME"
}

remove_redis() {
  echo "Removing Redis container and volume: $REDIS_CONTAINER_NAME / $REDIS_VOLUME"
  docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker volume rm "$REDIS_VOLUME" >/dev/null 2>&1 || true
  docker volume rm redis_data >/dev/null 2>&1 || true
}

status_redis() {
  docker ps -a --filter "name=^/${REDIS_CONTAINER_NAME}$" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

  if docker ps --format '{{.Names}}' | grep -Fx "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 && redis_ping; then
    echo "Redis ping: PONG"
  else
    echo "Redis ping: unavailable"
  fi
}

case "$ACTION" in
  start)
    start_redis
    ;;
  stop)
    stop_redis
    ;;
  restart)
    stop_redis
    start_redis
    ;;
  reinstall|reset|clean)
    remove_redis
    start_redis
    ;;
  status)
    status_redis
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown Redis action: $ACTION" >&2
    usage >&2
    exit 1
    ;;
esac
