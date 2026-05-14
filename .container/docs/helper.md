chmod +x ./.container/bash-sh/*.sh
chmod +x ./.container/clients/*/setup.sh
chmod +x ./.container/entrypoint.sh


```
CONFIRM_DESTRUCTIVE_CLEAN=YES ./.container/bash-sh/clean.sh
```


server {
listen 80;
listen [::]:80;
server_name ganapathi.codexsun.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 80;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}


sudo ln -s /etc/nginx/sites-available/ganapathi.codexsun.com /etc/nginx/sites-enabled/ganapathi.codexsun.com
sudo nginx -t
sudo systemctl reload nginx