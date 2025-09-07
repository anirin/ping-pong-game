FROM node:20-alpine
RUN npm install -g typescript
RUN apk add --no-cache openssl

WORKDIR /app
COPY package*.json ./
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080

ENTRYPOINT [ "/app/entrypoint.sh" ]
