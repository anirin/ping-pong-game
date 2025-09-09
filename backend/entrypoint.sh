#! /bin/sh

if [ ! -f /app/secrets/server.crt ]; then
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout /app/secrets/server.key \
        -out /app/secrets/server.crt \
        -days 365 -subj "/CN=trascen.com";
fi;

npm ci
npm run build
npm run start