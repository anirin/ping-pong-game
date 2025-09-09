FROM node:20-alpine
RUN npm install -g typescript
RUN apk add --no-cache openssl

WORKDIR /backend
COPY package*.json ./
COPY ./entrypoint.sh /backend/entrypoint.sh
RUN chmod +x /backend/entrypoint.sh
EXPOSE 8080

ENTRYPOINT [ "/backend/entrypoint.sh" ]
