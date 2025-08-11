FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev"]