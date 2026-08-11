# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .routes import scan, schedule, port_check, compare, topology, vulnerabilities, analytics
from .knowledge_base import router as knowledge_router

app = FastAPI(title="Nmap Panel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # можно оставить для dev
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

@app.get("/")
def root():
    return {"message": "Nmap Panel API"}   # пока оставим

# ---------- НОВОЕ: раздача статики ----------
static_dir = os.path.join(os.path.dirname(__file__), "../../nmap-panel/dist")   # путь относительно этого файла

if os.path.exists(static_dir):
    # Монтируем папку assets (в ней лежат JS/CSS/шрифты)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Для всех остальных путей (кроме /api) отдаём index.html (SPA)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Если путь начинается с /api – пропускаем (FastAPI обработает их раньше)
        if full_path.startswith("api/"):
            # эта ветка не должна срабатывать, т.к. роутеры объявлены выше
            pass
        # Пытаемся отдать файл, если он существует (например, favicon.ico)
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Иначе отдаём index.html (для роутинга React)
        return FileResponse(os.path.join(static_dir, "index.html"))