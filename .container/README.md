# CXSun Docker Deploy Guide

This container setup deploys CXSun from the fixed repository:

```bash
https://github.com/CODEXSUN/cxsun.git
```

It clones the repo into `/workspace/cxsun`, creates `.env` from `.env.sample` when needed, writes container port/database values, builds into root `build/`, then runs the backend and frontend preview.

Default services:

- Backend: `http://localhost:6001`
- Frontend: `http://localhost:6010`

## 1. Required Setup

Install Docker and Docker Compose on the server, then clone or copy this project folder there.

Optional values:

```bash
export GIT_BRANCH=main
export PORT=6001
export VITE_PORT=6010
export VITE_API_BASE_URL=http://localhost:6001
export DB_HOST=postgres
export DB_PORT=5432
export DB_NAME=codexsun_db
export DB_USER=codexsun
export DB_PASSWORD='DbPass1@@'
export REDIS_HOST=redis
export REDIS_PORT=6379
```

Create the shared Docker network once:

```bash
docker network create codexion-network
```

If the network already exists, Docker will report it and you can continue.

## 2. Start Existing Database Services

The app compose joins the existing `codexion-network`. Database services in `.container/database` already use the same network.

Start PostgreSQL:

```bash
docker compose -f .container/database/postgres.yml up -d
```

Start Redis:

```bash
docker compose -f .container/database/redis.yml up -d
```

Start MariaDB only if you need it:

```bash
docker compose -f .container/database/mariadb.yml up -d
```

The app defaults to these container service names:

- PostgreSQL host: `postgres`
- Redis host: `redis`
- MariaDB host: `mariadb`

## 3. Build Image

Build only the Docker image:

```bash
docker build -f .container/Dockerfile -t cxsun:v1 .
```

Or build through Compose:

```bash
docker compose -f .container/docker-compose.yml build
```

## 4. Start With Compose

Start the app in the background:

```bash
docker compose -f .container/docker-compose.yml up -d --build
```

First startup will:

- Clone `https://github.com/CODEXSUN/cxsun.git` into `/workspace/cxsun`
- Copy `.env.sample` to `.env` if `.env` does not exist
- Write the configured ports, database host, and Redis host into `.env`
- Run `npm ci` or `npm install`
- Run `npm run build:active`
- Start backend and frontend preview

## 5. Check Status

Show running containers:

```bash
docker compose -f .container/docker-compose.yml ps
```

Check backend health:

```bash
curl http://localhost:6001/health
```

Open frontend:

```bash
http://localhost:6010
```

## 6. View Logs

Follow live logs:

```bash
docker compose -f .container/docker-compose.yml logs -f cxsun
```

Show recent logs:

```bash
docker compose -f .container/docker-compose.yml logs --tail=200 cxsun
```

## 7. Enter Bash

Open a shell inside the running container:

```bash
docker compose -f .container/docker-compose.yml exec cxsun bash
```

Go to the app folder:

```bash
cd /workspace/cxsun
```

## 8. Manual Pull, Build, Restart

Enter the container:

```bash
docker compose -f .container/docker-compose.yml exec cxsun bash
```

Pull updates and rebuild:

```bash
cd /workspace/cxsun
git pull --ff-only
npm ci
npm run build:active
exit
```

Restart the container:

```bash
docker compose -f .container/docker-compose.yml restart cxsun
```

## 9. Custom Ports

Run backend on `7001` and frontend on `7010`:

```bash
PORT=7001 VITE_PORT=7010 VITE_API_BASE_URL=http://localhost:7001 docker compose -f .container/docker-compose.yml up -d --build
```

Then use:

- Backend: `http://localhost:7001`
- Frontend: `http://localhost:7010`

## 10. Clean Local Redeploy Script

Run the full local redeploy order:

```bash
.container/setup-local.sh
```

The script will:

- Create `codexion-network` when missing
- Stop and remove the existing `cxsun` container
- Remove the `cxsun-volume` workspace volume
- Remove the old `cxsun_cxsun-workspace` volume when present
- Build the `cxsun:v1` image
- Start the app through `.container/docker-compose.yml`
- Print status and recent logs

## 11. Stop Or Remove

Stop the container:

```bash
docker compose -f .container/docker-compose.yml stop
```

Stop and remove the container/network:

```bash
docker compose -f .container/docker-compose.yml down
```

Remove the persistent workspace volume too:

```bash
docker compose -f .container/docker-compose.yml down -v
```

The persistent workspace volume is named `cxsun-volume`.
