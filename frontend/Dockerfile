FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
ENV API_BASE=http://localhost:8080
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev"]