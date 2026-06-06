```
server {
server_name asknits.codexsun.com;

    large_client_header_buffers 8 32k;
    client_header_buffer_size 16k;

    location /storage/ {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header Cookie "";
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:6010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

}

server {
    if ($host = asknits.codexsun.com) {
      return 301 https://$host$request_uri;
    }

    listen 80;
    server_name asknits.codexsun.com;
    return 404; # managed by Certbot
}
```

```
sudo nginx -t
sudo systemctl reload nginx
```

sudo certbot --nginx -d asknits.codexsun.com