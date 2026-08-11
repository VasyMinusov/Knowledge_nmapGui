#!/bin/bash

# Путь к собранному фронтенду
FRONTEND_DIR="./nmap-panel/dist"
# Путь к конфигу nginx (создадим ниже)
NGINX_CONF="./nginx.conf"

# Проверяем, что dist существует
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Ошибка: папка $FRONTEND_DIR не найдена. Соберите фронтенд."
    exit 1
fi

# Запускаем nginx с нашей конфигурацией в фоне
echo "Запуск Nginx..."
nginx -c "$NGINX_CONF" -p "$(pwd)" &

# Сохраняем PID nginx для последующей остановки
NGINX_PID=$!

# Ждём, пока nginx поднимется
sleep 1

# Запускаем бэкенд
echo "Запуск Uvicorn..."
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
# После завершения uvicorn (Ctrl+C) выполняем очистку
cd ..

# Останавливаем nginx
echo "Останавливаем Nginx..."
kill -TERM $NGINX_PID
wait $NGINX_PID 2>/dev/null

echo "Сервисы остановлены."