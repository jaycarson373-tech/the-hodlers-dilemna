FROM node:22.19-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

FROM base AS build

WORKDIR /app/railway

COPY railway/package.json railway/pnpm-lock.yaml railway/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY railway/tsconfig.json ./tsconfig.json
COPY railway/src ./src
RUN pnpm build && pnpm prune --prod

FROM base AS runner

ENV NODE_ENV=production

WORKDIR /app/railway

COPY --from=build /app/railway/package.json ./package.json
COPY --from=build /app/railway/node_modules ./node_modules
COPY --from=build /app/railway/dist ./dist

EXPOSE 3001

CMD ["pnpm", "start"]
