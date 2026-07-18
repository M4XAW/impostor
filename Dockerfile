FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
