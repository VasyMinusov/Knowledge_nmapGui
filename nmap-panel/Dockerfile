# Контекст сборки — КОРЕНЬ репозитория (см. docker-compose.build.yml).
# Обычный запуск использует готовый dist из репозитория и стоковый nginx —
# этот Dockerfile нужен только чтобы собрать фронт из исходников внутри Docker
# (требуется доступ к npm-реестру во время сборки).

# --- Сборка фронтенда ---
FROM node:22-alpine AS build
WORKDIR /app

# VITE_API_BASE пуст по умолчанию => фронт ходит на относительный /api,
# который nginx проксирует на backend. Хост нигде не вшивается в бандл.
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}

# pnpm ставим напрямую через npm (без corepack — он капризен к сети).
# Версия должна понимать lockfileVersion 9.0 из pnpm-lock.yaml.
RUN npm install -g pnpm@9 --loglevel=error \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-maxtimeout 120000

COPY nmap-panel/package.json nmap-panel/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY nmap-panel/ ./
RUN pnpm build

# --- Отдача через nginx ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
