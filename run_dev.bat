@echo off
REM Локальный запуск без Docker: собираем фронт и поднимаем бэкенд.
REM Бэкенд на :5000 отдаёт и API, и собранный фронт с того же адреса,
REM поэтому фронт обращается к относительному /api — хост нигде не захардкожен.

cd /d "%~dp0nmap-panel"
if not exist dist (
    echo [run_dev] Сборка фронтенда...
    call pnpm install || goto :err
    call pnpm build || goto :err
)

cd /d "%~dp0backend"
if not exist venv (
    echo [run_dev] Создание venv...
    python -m venv venv || goto :err
    call venv\Scripts\pip install -r requirements.txt || goto :err
)

echo [run_dev] Бэкенд + панель: http://localhost:5000
venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
goto :eof

:err
echo [run_dev] Ошибка. Проверьте, что установлены Python и pnpm (Node.js).
exit /b 1
