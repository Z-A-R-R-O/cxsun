# External Redis

Redis runs as a separate container by default in cloud setup. That means Redis runs on
`codexion-network`, not inside the CXSun app compose service.

1. Copy or source the sample values:

```bash
cp .container/database/redis.external.env.sample .container/database/redis.external.env
```

2. Edit the external values:

```bash
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false
```

3. Source the file and deploy:

```bash
set -a
. .container/database/redis.external.env
set +a
bash .container/setup-cloud.sh
```

For a clean app and Redis reinstall without touching MariaDB:

```bash
bash .container/setup-cloud.sh --reinstall
```

For local deploys, run the local setup script normally unless custom Redis values are needed:

```bash
set -a
. .container/database/redis.external.env
set +a
bash .container/setup-local.sh
```
