FROM node:24-slim AS build
WORKDIR /build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/ packages/server/
RUN corepack enable && pnpm install --frozen-lockfile --filter @soda3js/server
RUN pnpm --filter @soda3js/server build:prod

FROM node:24-slim
WORKDIR /app
COPY --from=build /build/packages/server/dist/npm/ ./
COPY __fixtures__/datasets/ /data/fixtures/
EXPOSE 3000
CMD ["node", "standalone.js"]
