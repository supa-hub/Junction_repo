# 1. Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# 2. Runtime stage: Nginx serving static files
FROM nginx:stable-alpine

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy React build to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run will set PORT (default 8080). We already configured Nginx to listen on 8080.

# No CMD needed; base image already runs nginx
