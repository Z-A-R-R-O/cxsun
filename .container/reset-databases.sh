#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-cxsun_master}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
MODE="${1:-}"

usage() {
  cat <<'EOF'
Usage: .container/reset-databases.sh [--clients|--master|--all]

Dangerous database reset helper.

Options:
  --clients  Drop all tenant/client databases listed in the master tenants table.
  --master   Drop only the master database.
  --all      Drop tenant/client databases first, then drop the master database.

Environment:
  DB_HOST      MariaDB host, default mariadb
  DB_PORT      MariaDB port, default 3306
  DB_NAME      Master database name, default cxsun_master
  DB_USER      MariaDB user, default root
  DB_PASSWORD  MariaDB password, default DbPass1@@
EOF
}

case "$MODE" in
  --clients|--master|--all)
    ;;
  -h|--help|"")
    usage
    exit 0
    ;;
  *)
    echo "Unknown option: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac

mysql_exec() {
  mysql \
    --batch \
    --skip-column-names \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    "$@"
}

quote_identifier() {
  printf '`%s`' "$(printf '%s' "$1" | sed 's/`/``/g')"
}

confirm() {
  prompt="$1"
  expected="$2"

  printf '%s\n' "$prompt"
  printf 'Type %s to continue: ' "$expected"
  read -r reply

  if [ "$reply" != "$expected" ]; then
    echo "Confirmation failed. No databases were dropped."
    exit 1
  fi
}

echo "MariaDB: $DB_HOST:$DB_PORT"
echo "Master database: $DB_NAME"
echo "Mode: $MODE"

echo "Checking MariaDB connection"
mysqladmin ping \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --silent >/dev/null
echo "MariaDB is reachable"

load_client_databases() {
  if ! mysql_exec -e "SHOW DATABASES LIKE '$DB_NAME'" | grep -Fx "$DB_NAME" >/dev/null 2>&1; then
    echo "Master database $DB_NAME was not found. No client database list can be loaded." >&2
    return 1
  fi

  if ! mysql_exec "$DB_NAME" -e "SHOW TABLES LIKE 'tenants'" | grep -Fx tenants >/dev/null 2>&1; then
    echo "Master table tenants was not found. No client database list can be loaded." >&2
    return 1
  fi

  mysql_exec "$DB_NAME" -e "
    SELECT DISTINCT db_name
    FROM tenants
    WHERE db_type = 'mariadb'
      AND db_name IS NOT NULL
      AND db_name <> ''
      AND db_name <> '$DB_NAME'
    ORDER BY db_name
  "
}

drop_client_databases() {
  mapfile -t client_databases < <(load_client_databases)

  if [ "${#client_databases[@]}" -eq 0 ]; then
    echo "No client databases found in $DB_NAME.tenants."
    return
  fi

  echo "Client databases to drop:"
  printf '  - %s\n' "${client_databases[@]}"
  confirm "This will permanently drop all listed tenant/client databases." "DROP CLIENTS"

  for database in "${client_databases[@]}"; do
    echo "Dropping client database: $database"
    mysql_exec -e "DROP DATABASE IF EXISTS $(quote_identifier "$database")"
  done

  echo "Client database reset complete."
}

drop_master_database() {
  confirm "This will permanently drop the master database $DB_NAME." "DROP MASTER"
  echo "Dropping master database: $DB_NAME"
  mysql_exec -e "DROP DATABASE IF EXISTS $(quote_identifier "$DB_NAME")"
  echo "Master database reset complete."
}

case "$MODE" in
  --clients)
    drop_client_databases
    ;;
  --master)
    drop_master_database
    ;;
  --all)
    drop_client_databases
    drop_master_database
    ;;
esac

echo "Database reset script finished."
