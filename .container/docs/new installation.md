git clone https://github.com/CODEXSUN/cxsun.git
cd cxsun
bash .container/setup-cloud.sh

bash .container/setup-cloud.sh --reinstall

bash .container/setup-cloud.sh --help


bash .container/reset-databases.sh --clients
bash .container/reset-databases.sh --master
bash .container/reset-databases.sh --all

bash .container/setup-redis.sh status
bash .container/setup-redis.sh stop
bash .container/setup-redis.sh start
bash .container/setup-redis.sh restart
bash .container/setup-redis.sh reinstall

bash .container/setup-redis.sh reinstall
bash .container/setup-cloud.sh --reinstall