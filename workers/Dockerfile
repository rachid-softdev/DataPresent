# Stage 1: Install dependencies + Build
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY datapresent-web/package.json ./datapresent-web/
COPY workers/package.json ./workers/
COPY workers/tsconfig.json ./workers/

RUN pnpm install --frozen-lockfile

COPY datapresent-web/prisma ./datapresent-web/prisma

RUN cd workers && npx prisma generate --schema=../datapresent-web/prisma/schema.prisma

COPY workers/src ./workers/src

RUN cd workers && npx tsc

# Stage 2: Production runtime
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/workers/dist ./dist
# Copy pnpm store (monorepo hoists all deps to root node_modules)
COPY --from=builder /app/node_modules ./node_modules
# Copy Prisma client generated in workers context
COPY --from=builder /app/workers/node_modules/.prisma ./node_modules/.prisma

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => {if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
