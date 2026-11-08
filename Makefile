# Makefile — инфраструктура Nmap Panel / Pentest Platform
#
# Профили инструментов backend-образа (TOOLS_PROFILE):
#   slim — только apt-пакеты (быстрая сборка)
#   full — apt + Go/pipx/testssl (по умолчанию)
#   max  — full + Metasploit + searchsploit + SecLists (~3–4 ГБ)
#
# Быстрый старт: make help

.DEFAULT_GOAL := help

# ── Переменные ────────────────────────────────────────────────────────────────
WEB_PORT      ?= 80
TOOLS_PROFILE ?= full
COMPOSE       ?= docker compose

COMPOSE_CMD    := WEB_PORT=$(WEB_PORT) TOOLS_PROFILE=$(TOOLS_PROFILE) $(COMPOSE)
BACKEND         = backend
FRONTEND_DIR    = nmap-panel
DB_FILE         = backend/nmap_panel.db
DB_DUMP_DIR     = backups

# Инструменты, наличие которых проверяет `make tools-status`
TOOLS_BINARIES := nmap masscan rustscan naabu whatweb wafw00f nikto nuclei \
	gobuster ffuf feroxbuster dirsearch wfuzz httpx katana gau waybackurls \
	subfinder assetfinder findomain amass theHarvester dnsx dnsrecon dnsenum \
	fierce whois curl sqlmap dalfox wpscan xsstrike commix joomscan \
	droopescan cmseek arjun searchsploit sslscan testssl tlsx sslyze \
	hydra medusa patator ncrack john hashcat cewl crunch enum4linux-ng \
	smbclient smbmap nbtscan rpcclient snmpwalk ldapsearch showmount mtr \
	dig host openssl jq msfconsole msfvenom

.PHONY: help up down restart ps logs logs-backend \
	build build-slim build-full build-max rebuild \
	shell shell-backend build-frontend dev dev-backend dev-frontend \
	db-shell db-dump db-reset tools-status wordlists \
	test lint clean clean-all

# ── Справка ───────────────────────────────────────────────────────────────────
help: ## Показать список целей
	@echo "Nmap Panel — управление проектом"
	@echo ""
	@echo "Переменные: WEB_PORT=$(WEB_PORT)  TOOLS_PROFILE=$(TOOLS_PROFILE)  COMPOSE=$(COMPOSE)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ── Жизненный цикл ────────────────────────────────────────────────────────────
up: ## Поднять стек (backend + nginx)
	$(COMPOSE_CMD) up -d

down: ## Остановить стек
	$(COMPOSE_CMD) down

restart: ## Перезапустить сервисы
	$(COMPOSE_CMD) restart

ps: ## Статус контейнеров
	$(COMPOSE_CMD) ps

logs: ## Логи всех сервисов (follow)
	$(COMPOSE_CMD) logs -f

logs-backend: ## Логи только backend (follow)
	$(COMPOSE_CMD) logs -f backend

# ── Сборка ────────────────────────────────────────────────────────────────────
build: ## Сборка с профилем из env (TOOLS_PROFILE=$(TOOLS_PROFILE))
	$(COMPOSE_CMD) build

build-slim: ## Сборка профиля slim (только apt)
	$(MAKE) build TOOLS_PROFILE=slim

build-full: ## Сборка профиля full (+ Go/pipx/testssl)
	$(MAKE) build TOOLS_PROFILE=full

build-max: ## Сборка профиля max (+ MSF + SecLists, ~3–4 ГБ)
	$(MAKE) build TOOLS_PROFILE=max

rebuild: ## Полная пересборка: down + build + up
	$(COMPOSE_CMD) down
	$(COMPOSE_CMD) build
	$(COMPOSE_CMD) up -d

build-frontend: ## Собрать фронтенд (pnpm build → nmap-panel/dist)
	cd $(FRONTEND_DIR) && pnpm build

# ── Доступ внутрь ─────────────────────────────────────────────────────────────
shell: shell-backend ## Шелл в контейнере backend

shell-backend: ## Шелл в контейнере backend
	$(COMPOSE_CMD) exec $(BACKEND) bash

# ── Локальная разработка без Docker ──────────────────────────────────────────
dev: ## Локальный dev: uvicorn --reload + pnpm dev (Ctrl-C останавливает оба)
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Только backend с автоперезагрузкой (порт 5000)
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 5000

dev-frontend: ## Только фронтенд dev-сервер Vite
	cd $(FRONTEND_DIR) && pnpm dev

# ── База данных (SQLite) ──────────────────────────────────────────────────────
db-shell: ## sqlite3-консоль к $(DB_FILE)
	sqlite3 $(DB_FILE)

db-dump: ## Дамп БД в $(DB_DUMP_DIR)/nmap_panel_<дата>.sql
	@mkdir -p $(DB_DUMP_DIR)
	sqlite3 $(DB_FILE) .dump > $(DB_DUMP_DIR)/nmap_panel_$$(date +%Y%m%d_%H%M%S).sql
	@ls -la $(DB_DUMP_DIR)/ | tail -1

db-reset: ## Удалить файл БД (с подтверждением) и пересоздать при старте
	@echo "Будет удалён $(DB_FILE). Продолжить? [y/N]"; \
	read -r ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		rm -f $(DB_FILE) && echo "Удалено. БД пересоздастся при следующем запуске backend."; \
	else \
		echo "Отменено."; \
	fi

# ── Инструменты ───────────────────────────────────────────────────────────────
tools-status: ## Какие бинарники реально доступны в контейнере backend
	@$(COMPOSE_CMD) exec -T $(BACKEND) sh -c '\
		ok=0; miss=0; \
		for b in $(TOOLS_BINARIES); do \
			if command -v $$b >/dev/null 2>&1; then \
				printf "  [ ok ] %s\n" $$b; ok=$$((ok+1)); \
			else \
				printf "  [ -- ] %s\n" $$b; miss=$$((miss+1)); \
			fi; \
		done; \
		echo "---"; echo "доступно: $$ok, отсутствует: $$miss (профиль: $$TOOLS_PROFILE)"'

wordlists: ## Список словарей (SecLists и системные) в контейнере
	@$(COMPOSE_CMD) exec -T $(BACKEND) sh -c '\
		for d in /usr/share/seclists /usr/share/wordlists /app/app/wordlists; do \
			if [ -d "$$d" ]; then \
				echo "== $$d =="; \
				find "$$d" -type f \( -name "*.txt" -o -name "*.lst" \) | head -40; \
			fi; \
		done'

# ── Качество кода ─────────────────────────────────────────────────────────────
test: ## Тесты backend (pytest, если есть; иначе проверка компиляции)
	@if command -v pytest >/dev/null 2>&1 && ls backend/tests 2>/dev/null | grep -q .; then \
		cd backend && pytest -q; \
	else \
		echo "Тестов нет — проверяю синтаксис Python:"; \
		python3 -m compileall -q backend/app && echo "OK"; \
	fi

lint: ## Линт backend (ruff/flake8, если установлены)
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check backend/app; \
	elif command -v flake8 >/dev/null 2>&1; then \
		flake8 backend/app --max-line-length=120; \
	else \
		echo "ruff/flake8 не установлены — pip install ruff"; \
	fi

# ── Уборка ────────────────────────────────────────────────────────────────────
clean: ## Удалить результаты запусков (scans/, audit_runs/, terminal_runs/)
	rm -rf scans/* backend/audit_runs/* backend/terminal_runs/*
	@echo "Рабочие каталоги очищены (БД сохранена)"

clean-all: clean ## clean + остановить стек и удалить тома (БД сохраняется)
	$(COMPOSE_CMD) down -v --remove-orphans
