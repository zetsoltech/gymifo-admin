# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html

# Customize nginx for SPA fallback and gzip compression
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
