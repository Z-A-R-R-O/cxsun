# CXSun Docker Deploy Guide

This container setup deploys CXSun from the fixed repository:

```bash
https://github.com/CODEXSUN/cxsun.git
```

It clones the repo into `/workspace/cxsun`, creates `.env` from `.env.sample` when needed, writes container port/database values, builds into root `build/`, then runs the backend and frontend preview.

Default services:

- Public URL: `https://codexsun.com`
- Backend container port: `6005`
- Frontend container port: `6010`
- MariaDB access from the app: `mariadb:3306`
- Redis container access from the app: `redis:6379`
- Redis host access: `localhost:6380`
- External Redis is the default cloud mode: Redis runs as a separate container on `codexion-network`.
- CORS defaults: `https://codexsun.com` and `https://www.codexsun.com`.

Create the shared Docker network once:

```bash
docker network create codexion-network
```

If the network already exists, Docker will report it and you can continue.

## 2. Start Services

The app compose joins the existing `codexion-network`.

MariaDB is expected to already exist on the same Docker network with service/container host `mariadb`, port `3306`, and root password `DbPass1@@`.

Redis runs as a separate container on `codexion-network` by default:

```bash
.container/setup-cloud.sh
```

The app defaults to these container service names:

- MariaDB host: `mariadb`
- Redis host: `redis`

Redis intentionally publishes a host port that does not conflict with typical local installs:

- Redis container port `6379` is published as host port `6380`.

## 3. Build Image

Build only the Docker image:

```bash
docker build -f .container/Dockerfile -t cxsun:v1 .
```

## 4. Start With Compose

Start the app in the background:

```bash
docker compose -f .container/docker-compose.yml up -d --build
```

First startup will:

- Clone `https://github.com/CODEXSUN/cxsun.git` into `/workspace/cxsun`
- Copy `.env.sample` to `.env` if `.env` does not exist
- Write the configured ports, MariaDB host, and Redis host into `.env`
- Generate `JWT_SECRET` when it is not already present
- Write optional admin seed variables from the deploy environment when provided
- Start Redis as a separate container on `codexion-network` when using the setup scripts
- Wait for Redis to answer `PONG` before starting the app
- Run `npm ci` or `npm install`
- Run ordered database setup with master migrate, master seed, and active tenant provisioning
- Seed only the first live install tenants: CODEXSUN Shared Billing and Aaran Associates
- Skip install-time tenant tests by default; set `INSTALL_RUN_TESTS=true` to run them during container startup
- Remove previous build output before building
- Run `npm run build:active`
- Start backend and frontend preview

## 5. Check Status

Show running containers:

```bash
docker compose -f .container/docker-compose.yml ps
```

Check backend health:

```bash
curl https://codexsun.com/health
```

Open frontend:

```bash
https://codexsun.com
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

Run backend on `7005`, frontend on `7010`, and keep the public cloud URL:

```bash
PORT=7005 VITE_PORT=7010 VITE_API_BASE_URL=https://codexsun.com FRONTEND_URL=https://codexsun.com CORS_ORIGINS=https://codexsun.com,https://www.codexsun.com docker compose -f .container/docker-compose.yml up -d --build
```

Then use:

- Public URL: `https://codexsun.com`

## 10. Cloud Deploy Script

Run the cloud deploy order for `https://codexsun.com`:

```bash
.container/setup-cloud.sh
```

Run with one-time seeded platform users:

```bash
SUPER_ADMIN_NAME='SUNDAR' \
SUPER_ADMIN_EMAIL='sundar@sundar.com' \
SUPER_ADMIN_PASSWORD='Kalarani1@@' \
SOFTWARE_ADMIN_NAME='Admin' \
SOFTWARE_ADMIN_EMAIL='admin@admin.com' \
SOFTWARE_ADMIN_PASSWORD='Admin@123' \
.container/setup-cloud.sh
```

These are also the default live seed values used by `.container/setup-cloud.sh` when the variables are not overridden.

Generate or rotate `JWT_SECRET` in an env file manually:

```bash
bash .container/generate-jwt-secret.sh .env
```

Run cloud deploy with the default external Redis container:

```bash
.container/setup-cloud.sh
```

Manage Redis separately when you want to stop, start, or clean-reinstall only Redis:

```bash
bash .container/setup-redis.sh status
bash .container/setup-redis.sh stop
bash .container/setup-redis.sh start
bash .container/setup-redis.sh reinstall
```

The Redis helper keeps the same defaults as cloud setup: container name `redis`, container port `6379`, host port `6380`, and Docker network `codexion-network`.

Run a fresh app and Redis reinstall without touching MariaDB:

```bash
.container/setup-cloud.sh --reinstall
```

Reset databases intentionally when you need a fully clean MariaDB state:

```bash
bash .container/reset-databases.sh --clients
bash .container/reset-databases.sh --master
bash .container/reset-databases.sh --all
```

The reset script asks for separate typed confirmations before dropping client databases and before dropping the master database. It never runs as part of normal reinstall.
When the host does not have `mysql` or `mysqladmin` installed, it falls back to running the MariaDB client inside the `DB_CONTAINER` Docker container, which defaults to `DB_HOST`.

Run install-time safety tests during deploy when needed:

```bash
INSTALL_RUN_TESTS=true .container/setup-cloud.sh --reinstall
```

The script will:

- Create `codexion-network` when missing
- Start Redis as a separate container on `codexion-network`
- Reconnect an already-running Redis container to `codexion-network`
- Wait for Redis to answer `PONG` before starting CXSun
- Use the existing MariaDB service at `mariadb:3306`
- Generate and persist `JWT_SECRET` when missing
- Run `npm -w apps/server run db:setup`
- Seed only CODEXSUN and Aaran Associates on first install; create other tenants later from Super Admin
- Stream container logs while waiting for backend health so dependency install, migrations, seeds, and build progress are visible
- Run tenant safety tests only when `INSTALL_RUN_TESTS=true`
- Build the `cxsun:v1` image
- Start the app through `.container/docker-compose.yml`
- Wait for `/health` and verify `codexsun.com` resolves as a tenant
- Configure `VITE_API_BASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` for `https://codexsun.com`
- Remove the CXSun app workspace volume, reset Redis cache/container, and rebuild the app image without cache when `--fresh` or `--reinstall` is passed
- Never remove or recreate MariaDB
- Print status and recent logs

## 11. Clean Local Redeploy Script

Run the full local redeploy order:

```bash
bash .container/setup-local.sh
```

The script will:

- Create `codexion-network` when missing
- Stop and remove the existing `cxsun` container
- Remove the `cxsun-volume` workspace volume
- Remove the old `cxsun_cxsun-workspace` volume when present
- Build the `cxsun:v1` image
- Start the app through `.container/docker-compose.yml`
- Print status and recent logs

## 12. Stop Or Remove

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
