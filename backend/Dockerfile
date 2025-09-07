FROM node:20-alpine
RUN npm install -g typescript

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080

ENTRYPOINT [ "/app/entrypoint.sh" ]
