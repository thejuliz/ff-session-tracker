FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./
RUN mkdir -p data

EXPOSE 3001
CMD ["node", "src/server.js"]
