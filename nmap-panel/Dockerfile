# Контекст сборки — КОРЕНЬ репозитория (см. docker-compose.yml: context: .)
# Так один образ содержит и собранный фронт, и конфиг nginx — хост-монтирования не нужны.

# --- Сборка фронтенда ---
FROM node:22-alpine AS build
WORKDIR /app

# VITE_API_BASE пуст по умолчанию => фронт ходит на относительный /api,
# который nginx проксирует на backend. Хост нигде не вшивается в бандл.
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}

RUN corepack enable
COPY nmap-panel/package.json nmap-panel/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY nmap-panel/ ./
RUN pnpm build

# --- Отдача через nginx ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
