# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl poppler-utils
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 2: production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl poppler-utils
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
