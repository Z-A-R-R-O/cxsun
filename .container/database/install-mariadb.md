## MariaDb Installation

### Clone the repository
```
git clone https://github.com/aaran-software/cloudxis.git
```

### create network for codexion

```
docker network create codexion-network
```

### create container for mariadb

```
docker compose -f .container/database/mariadb.yml up -d
```

### Check mariadb is installed

```
docker exec -it mariadb mariadb -u root -p
```

# remote access for root user 

```
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

# 4. Allow access on your Ubuntu host (firewall):
# If using UFW:

```
sudo ufw allow 3306/tcp
```
```
sudo ufw reload
```
```
sudo ufw status
```
status : inactive