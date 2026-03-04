# Multi-purpose simple dev Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install || true
COPY . .
EXPOSE 4000 5173
CMD ["npm","run","dev"]
