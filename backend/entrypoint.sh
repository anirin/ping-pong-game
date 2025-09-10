#! /bin/sh

cd /blockchain
npm ci
npx hardhat compile
npx hardhat run scripts/deploy.ts --network blockchain
cd /backend

npm ci
npm run build
npm run start