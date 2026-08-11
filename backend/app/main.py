# backend/app/main.py
import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routes import scan, schedule, port_check, compare, topology, vulnerabilities, analytics
from app.knowledge_base import router as knowledge_router

app = FastAPI(title="Nmap Panel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(knowledge_router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(port_check.router, prefix="/api/port-check", tags=["port-check"])
app.include_router(compare.router)
app.include_router(topology.router)
app.include_router(vulnerabilities.router)
app.include_router(analytics.router)

# ---------- Раздача статики ----------
def get_static_dir():
    if getattr(sys, 'frozen', False):
        # Запуск из PyInstaller
        base = sys._MEIPASS
        static = os.path.join(base, "dist")
    else:
        # Режим разработки: проект лежит в корне, backend/app, а dist в ../nmap-panel/dist
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        static = os.path.join(base, "nmap-panel", "dist")
    return static

static_dir = get_static_dir()

if os.path.exists(static_dir):
    # Монтируем папку assets (в ней лежат JS/CSS/шрифты)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Для всех остальных путей (кроме /api) отдаём index.html (SPA)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            # пропускаем, т.к. роутеры обрабатывают /api
            pass
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "Nmap Panel API (frontend not built)"}