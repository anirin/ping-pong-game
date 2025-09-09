FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY hardhat.config.ts ./

RUN npm install
RUN npm ci

EXPOSE 8545

CMD ["npx", "hardhat", "node"]