# cxnext Container Usage

This folder contains the Docker files for Ubuntu deployment.

- `Dockerfile` builds only the cxnext application image.
- `docker-compose.yml` runs only the cxnext application container.
- `mariadb.yml` runs the separate MariaDB container.
- `50-server.cnf` is mounted into MariaDB.

## Required Defaults

The app connects to MariaDB through Docker networking:

```env
DB_DRIVER=mariadb
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=cxnext_db
DB_USER=root
DB_PASSWORD=DbPass1@@
```

MariaDB is exposed to the host as `3307:3306`, but containers on `codexion-network` use port `3306`.

## First Install On Ubuntu

Install Docker and Git:

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Clone the app:

```bash
git clone https://github.com/sundar-aaran/cxnext.git /opt/cxnext
cd /opt/cxnext
cp .env.sample .env
```

Edit `.env` and set production values:

```env
APP_ENV=production
APP_HOST=0.0.0.0
APP_HTTP_PORT=4000
FRONTEND_HTTP_PORT=3000
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=cxnext_db
DB_USER=root
DB_PASSWORD=DbPass1@@
JWT_SECRET=replace-with-a-long-random-production-secret
GIT_URL=https://github.com/sundar-aaran/cxnext.git
GIT_BRANCH=main
DEPLOY_DIR=/opt/cxnext
SYSTEM_UPDATE_ENABLED=true
```

## Start MariaDB

Create the shared network once:

```bash
docker network create codexion-network || true
```

Start MariaDB:

```bash
docker compose -f .container/mariadb.yml up -d
```

If you already have a `mariadb` container, connect it to the same network:

```bash
docker network connect codexion-network mariadb || true
```

## Database Create Or Update

Create `cxnext_db` only when it is missing:

```bash
docker exec mariadb mariadb -uroot -p'DbPass1@@' -e "CREATE DATABASE IF NOT EXISTS cxnext_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If the database already exists, update the schema and seed/update data:

```bash
docker compose -f .container/docker-compose.yml exec app pnpm db:prepare
```

If you want a fresh database, confirm the data-loss choice manually, back up first, then run the project fresh command:

```bash
docker compose -f .container/docker-compose.yml exec app pnpm db:fresh
```

The compose files do not drop an existing database automatically.

## Build And Start App

Build the application image:

```bash
docker compose -f .container/docker-compose.yml build app
```

Start or restart the app:

```bash
docker compose -f .container/docker-compose.yml up -d app
```

Prepare the database after first app start:

```bash
docker compose -f .container/docker-compose.yml exec app pnpm db:prepare
```

Open:

- Frontend: `http://SERVER_IP:3000`
- API health: `http://SERVER_IP:4000/health`

## Manual Update

The updater reads `GIT_URL`, `GIT_BRANCH`, `DEPLOY_DIR`, and `COMPOSE_FILE` from `.env`.

Recommended `.env` value:

```env
COMPOSE_FILE=.container/docker-compose.yml
```

Run:

```bash
node scripts/system-update.mjs preflight
node scripts/system-update.mjs deploy
```

The deploy command runs preflight, pulls the configured Git branch, builds the app image, and restarts the app service.

## App Update Button

In the app, open `Settings > System Update` and use `Sync, Build & Restart`.

For this to work, the app container mounts:

- `/var/run/docker.sock`
- `../:/deploy/cxnext`
- `../.env:/app/.env`

Keep `SYSTEM_UPDATE_ENABLED=true` only for trusted admin deployments.


./.container/setup.sh codexsun

chmod +x ./.container/setup.sh
