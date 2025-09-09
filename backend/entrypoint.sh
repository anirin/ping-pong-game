#! /bin/sh

if [ ! -f /backend/secrets/server.crt ]; then
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout /backend/secrets/server.key \
        -out /backend/secrets/server.crt \
        -days 365 -subj "/CN=trascen.com";
fi;

cd /blockchain
npm ci
npx hardhat compile
npx hardhat run scripts/deploy.ts --network blockchain
cd /backend

npm ci
npm run build
npm run start