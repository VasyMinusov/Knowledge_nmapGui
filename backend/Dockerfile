FROM python:3.11-slim

# Профиль набора инструментов: slim (только apt) | full (apt + Go + pipx + testssl)
ARG TOOLS_PROFILE=full
ENV TOOLS_PROFILE=${TOOLS_PROFILE} \
    PATH="/usr/local/bin:/opt/go/bin:${PATH}" \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

# Инструменты пентеста/разведки/анализа (кэшируемый слой)
COPY install-tools.sh ./
RUN chmod +x install-tools.sh && ./install-tools.sh

# Python-зависимости приложения
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/scans /app/audit_runs /app/terminal_runs

EXPOSE 5000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
