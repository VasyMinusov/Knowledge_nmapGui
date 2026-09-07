# backend/app/routes/terminal.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.terminal import (
    ALLOWED_BINARIES,
    catalog_binaries,
    close_session,
    read_session,
    send_signal,
    start_command,
)
from app.terminal_catalog import TOOL_CATALOG

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


class ExecRequest(BaseModel):
    command: str


class SignalRequest(BaseModel):
    signal: str = "int"  # 'int' | 'kill'


@router.get("/catalog")
async def catalog():
    """Каталог инструментов/флагов для конструктора + доступность бинарников."""
    avail = catalog_binaries()
    tools = []
    for tool in TOOL_CATALOG:
        tools.append({**tool, "available": avail.get(tool["binary"].lower(), False)})
    return {
        "tools": tools,
        "binaries": avail,
        "allowed": sorted({b.lower() for b in ALLOWED_BINARIES}),
    }


@router.post("/exec")
async def exec_command(req: ExecRequest):
    session_id, error, warnings = start_command(req.command)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"session_id": session_id, "warnings": warnings}


@router.get("/session/{session_id}")
async def session_poll(session_id: str, cursor: int = 0):
    data = read_session(session_id, cursor)
    if data is None:
        raise HTTPException(status_code=404, detail="Сессия не найдена или устарела")
    return data


@router.post("/session/{session_id}/signal")
async def session_signal(session_id: str, req: SignalRequest):
    ok = send_signal(session_id, req.signal)
    if not ok:
        raise HTTPException(status_code=409, detail="Процесс уже завершён")
    return {"message": "Сигнал отправлен"}


@router.delete("/session/{session_id}")
async def session_close(session_id: str):
    close_session(session_id)
    return {"message": "Сессия закрыта"}
