#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 48
    return
  fi

  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
}

set_env_value() {
  key="$1"
  value="$2"

  touch "$ENV_FILE"
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
  ' "$ENV_FILE" > "$tmp_file"
  mv "$tmp_file" "$ENV_FILE"
}

set_env_value JWT_SECRET "$(generate_secret)"
echo "JWT_SECRET generated in $ENV_FILE"
