FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env .

RUN npx hardhat compile

EXPOSE 8545

CMD ["npx", "hardhat", "node"]