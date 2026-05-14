# Client Deployment

Use the shared client compose with one client env file at a time.

## One-command setup

```bash
./.container/setup.sh codexsun
```

The setup script:

- creates the shared Docker network
- starts MariaDB when it is not already running
- creates the client database when it is missing
- builds and starts the client app container
- runs `pnpm db:prepare`
- tests the direct frontend and API ports
- runs `pnpm smoke:test` when `SMOKE_TEST_ENABLED=true`

## Available clients

- `codexsun`
  - Frontend: `3005`
  - API: `4021`
  - Container: `codexsun-app`
  - Database: `codexsun_db`
- `cottonknits`
  - Frontend: `3006`
  - API: `4022`
  - Container: `cottonknits-app`
  - Database: `cottonknits_db`
- `sukraa`
  - Frontend: `3007`
  - API: `4023`
  - Container: `sukraa-app`
  - Database: `sukraa_db`
- `ganapathi`
  - Frontend: `3008`
  - API: `4024`
  - Container: `ganapathi-app`
  - Database: `ganapathi_db`
  - Domain: `ganapathi.codexsun.com`

## Manual codexsun usage

Create the database if needed:

```bash
docker exec mariadb mariadb -uroot -p'DbPass1@@' -e "CREATE DATABASE IF NOT EXISTS codexsun_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Build and start:

```bash
docker compose --env-file .container/client/codexsun/client.env -f .container/client/docker-compose.yml up -d --build app
```

Prepare the database schema:

```bash
docker compose --env-file .container/client/codexsun/client.env -f .container/client/docker-compose.yml exec -T app pnpm db:prepare
```

Check logs:

```bash
docker compose --env-file .container/client/codexsun/client.env -f .container/client/docker-compose.yml logs --tail=200 app
```

Open:

- Frontend: `https://codexsun.com`
- API health: `https://codexsun.com/health`
- Browser API base: `https://codexsun.com/api/v1`

When using Nginx, serve the frontend at `/` and proxy `/api/` to the backend
port without stripping the prefix. Example client blocks are available in
`.container/proxy/nginx-clients.conf`.

The frontend also includes a fallback rewrite for `/api/v1/*` plus legacy
`/api/*` forwarding to the internal backend port. Direct Nginx proxying is
still preferred.

Stop:

```bash
docker compose --env-file .container/client/codexsun/client.env -f .container/client/docker-compose.yml down
```

For the other clients, swap `codexsun` for `cottonknits`, `sukraa`, or `ganapathi`.
