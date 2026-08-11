FROM python:3.11-slim

WORKDIR /app

# Копируем зависимости и устанавливаем
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код бэкенда
COPY . .

# Создаём папку для результатов сканов (если её нет)
RUN mkdir -p /app/scans

# Открываем порт
EXPOSE 8000

# Запускаем сервер (режим production)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]