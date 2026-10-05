# Static build of the map, served by nginx. Coolify builds this on every push
# to main (including the daily data commits from .gitlab-ci.yml).

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Served at the domain root; vite.config.ts would otherwise infer a GitHub
# Pages sub-path from GITHUB_REPOSITORY.
ENV BASE_PATH=/
RUN pnpm build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
