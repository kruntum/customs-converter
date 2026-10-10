# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=server-dist/index.js
RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=esm --packages=external --outfile=prisma/seed.js
RUN npx esbuild prisma/seed-exchange-rates.ts --bundle --platform=node --format=esm --packages=external --outfile=prisma/seed-exchange-rates.js
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["node", "server-dist/index.js"]
