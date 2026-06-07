# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY datapresent-web/package.json ./datapresent-web/
COPY workers/package.json ./workers/
RUN corepack enable && pnpm install --frozen-lockfile --filter datapresent-web

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm --filter datapresent-web build

# Stage 3: Production runner (standalone)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/datapresent-web/.next/standalone ./
COPY --from=builder /app/datapresent-web/public ./datapresent-web/public
COPY --from=builder /app/datapresent-web/.next/static ./datapresent-web/.next/static
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER node
CMD ["node", "datapresent-web/server.js"]
