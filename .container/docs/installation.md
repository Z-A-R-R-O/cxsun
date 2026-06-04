```
export JWT_SECRET='replace-with-a-real-secret-of-at-least-16-characters'
export SECRET_OWNER_EMAIL='security@sundar.com'
export OPERATIONS_OWNER_EMAIL='devops@sundar.com'
export SUPER_ADMIN_EMAILS='sundar@sundar.com'

TARGET_ENV=cloud \
CODEXSUN_DOMAIN=codexsun.com \
CLEAN_INSTALL=true \
CONFIRM_CLEAN_INSTALL=YES \
DROP_DATABASES=true \
CONFIRM_DROP_DATABASES=YES \
BUILD_IMAGE=true \
CREATE_DATABASES=true \
bash ./.container/bash-sh/setup.sh codexsun
```


```
export JWT_SECRET='replace-with-a-real-secret-of-at-least-16-characters'
export SECRET_OWNER_EMAIL='security@sundar.com'
export OPERATIONS_OWNER_EMAIL='devops@sundar.com'
export SUPER_ADMIN_EMAILS='sundar@sundar.com'

TARGET_ENV=cloud \
CLIENTS=techmedia_in \
TECHMEDIA_IN_DOMAIN=techmedia.in \
CLEAN_INSTALL=true \
CONFIRM_CLEAN_INSTALL=YES \
BUILD_IMAGE=true \
CREATE_DATABASES=true \
bash ./.container/bash-sh/setup.sh
```

```
export JWT_SECRET='replace-with-a-real-secret-of-at-least-16-characters'
export SECRET_OWNER_EMAIL='security@sundar.com'
export OPERATIONS_OWNER_EMAIL='devops@sundar.com'
export SUPER_ADMIN_EMAILS='sundar@sundar.com'

TARGET_ENV=cloud \
CLIENTS=tmnext_in \
TMNEXT_IN_DOMAIN=tmnext_in \
CLEAN_INSTALL=true \
CONFIRM_CLEAN_INSTALL=YES \
BUILD_IMAGE=true \
bash ./.container/bash-sh/setup.sh tmnext_in
```

```
export JWT_SECRET='replace-with-a-real-secret-of-at-least-16-characters'
export SECRET_OWNER_EMAIL='security@sundar.com'
export OPERATIONS_OWNER_EMAIL='devops@sundar.com'
export SUPER_ADMIN_EMAILS='sundar@sundar.com'

TARGET_ENV=cloud \
CLIENTS=tirupurdirect_com \
TIRUPURDIRECT_COM_DOMAIN=tirupurdirect.com \
CLEAN_INSTALL=true \
CONFIRM_CLEAN_INSTALL=YES \
BUILD_IMAGE=true \
bash ./.container/bash-sh/setup.sh 
```



cp /home/codexsun/.container/clients/codexsun/nginx/codexsun.com.https.conf /etc/nginx/sites-available/codexsun.com
ln -sf /etc/nginx/sites-available/codexsun.com /etc/nginx/sites-enabled/codexsun.com

cp /home/codexsun/.container/clients/techmedia_in/nginx/techmedia.in.https.conf /etc/nginx/sites-available/techmedia.in
ln -sf /etc/nginx/sites-available/techmedia.in /etc/nginx/sites-enabled/techmedia.in

cp /home/codexsun/.container/clients/tirupurdirect_com/nginx/tirupurdirect.in.https.conf /etc/nginx/sites-available/tirupurdirect.in
ln -sf /etc/nginx/sites-available/tirupurdirect.in /etc/nginx/sites-enabled/tirupurdirect.in

cp /home/codexsun/.container/clients/thetirupurtextiles_com/nginx/thetirupurtextiles.com.https.conf /etc/nginx/sites-available/thetirupurtextiles.com
ln -sf /etc/nginx/sites-available/thetirupurtextiles.com /etc/nginx/sites-enabled/thetirupurtextiles.com

nginx -t && systemctl reload nginx
Then verify all four:
curl -k -s https://codexsun.com/health
curl -k -s https://techmedia.in/health
curl -k -s https://tirupurdirect.in/health
curl -k -s https://thetirupurtextiles.com/health
If you want to remove stray old configs too, inspect first:
ls -la /etc/nginx/sites-enabled
nginx -T | grep -n "server_name "
And if needed, delete obsolete ones manually, then reload:
rm -f /etc/nginx/sites-enabled/<old-file>
nginx -t && systemctl reload nginx


ln -sf /etc/nginx/sites-available/erpcotton.codexsun.com /etc/nginx/sites-enabled/erpcotton.codexsun.com
ln -sf /etc/nginx/sites-available/sukraa.codexsun.com /etc/nginx/sites-enabled/sukraa.codexsun.com
ln -sf /etc/nginx/sites-available/skprinters.codexsun.com /etc/nginx/sites-enabled/skprinters.codexsun.com

ln -sf /etc/nginx/sites-available/office.aaran.org /etc/nginx/sites-enabled/office.aaran.org