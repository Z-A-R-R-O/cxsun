# cxnext App Installation

This guide is only for installing and running the cxnext application container.

It assumes these are already available:

- Docker and Docker Compose
- Git
- MariaDB container reachable as `mariadb`
- Database `cxnext_db`
- Docker network required by `.container/docker-compose.yml`

## Clone App

```bash
git clone https://github.com/sundar-aaran/cxnext.git /opt/cxnext
cd /opt/cxnext
```

## Build App Image

```bash
docker compose -f .container/docker-compose.yml build app
```

## Start App

```bash
docker compose -f .container/docker-compose.yml up -d app
```

If `.env` is missing, cxnext starts in setup mode.

## Setup From Browser

Open:

```text
http://SERVER_IP:3000/setup
```

Fill the database and deployment values, then run:

```text
Save Setup
Pull, Build & Start
```

The setup page creates `.env`, downloads the latest cxnext version, builds the app image, and starts the application container.

## Setup From CLI

Use this when browser setup fails or the server has no browser access.

Create or update `.env`:

```bash
node scripts/setup.mjs configure \
  --set=APP_ENV=production \
  --set=APP_HOST=0.0.0.0 \
  --set=APP_HTTP_PORT=4000 \
  --set=FRONTEND_HTTP_PORT=3000 \
  --set=DB_HOST=mariadb \
  --set=DB_PORT=3306 \
  --set=DB_NAME=cxnext_db \
  --set=DB_USER=root \
  --set=DB_PASSWORD='DbPass1@@' \
  --set=JWT_SECRET=replace-with-a-long-random-production-secret \
  --set=GIT_URL=https://github.com/sundar-aaran/cxnext.git \
  --set=GIT_BRANCH=main \
  --set=DEPLOY_DIR=/opt/cxnext
```

Deploy:

```bash
node scripts/setup.mjs deploy
```

## Manual `.env` Reference

Edit `.env`:

```env
APP_ENV=production
APP_HOST=0.0.0.0
APP_HTTP_PORT=4000
FRONTEND_HTTP_PORT=3000

DB_DRIVER=mariadb
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=cxnext_db
DB_USER=root
DB_PASSWORD=DbPass1@@

JWT_SECRET=replace-with-a-long-random-production-secret

GIT_URL=https://github.com/sundar-aaran/cxnext.git
GIT_BRANCH=main
DEPLOY_DIR=/opt/cxnext
COMPOSE_FILE=.container/docker-compose.yml
SYSTEM_UPDATE_ENABLED=true
```

## Prepare Database

For existing or fresh database schema setup:

```bash
docker compose -f .container/docker-compose.yml exec app pnpm db:prepare
```

For a confirmed fresh reset:

```bash
docker compose -f .container/docker-compose.yml exec app pnpm db:fresh
```

## Open App

- Frontend: `http://SERVER_IP:3000`
- API health: `http://SERVER_IP:4000/health`

## Update App

Manual update from server:

```bash
node scripts/system-update.mjs preflight
node scripts/system-update.mjs deploy
```

Update from app:

```text
Settings > System Update > Sync, Build & Restart
```
