# backend/app/routes/audit.py
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.audit_tools import (
    CATEGORIES,
    cancel_audit_task,
    get_audit_status,
    list_tools,
    run_audit_task,
)
from app.database import delete_audit_task, get_audit_task, get_audit_tasks
from app.models import AuditRunRequest

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/tools")
async def audit_tools():
    """Список поддерживаемых инструментов аудита и их доступность в системе."""
    return {
        "categories": [{"id": k, "label": v} for k, v in CATEGORIES.items()],
        "tools": list_tools(),
    }


@router.post("/run")
async def audit_run(request: AuditRunRequest, background_tasks: BackgroundTasks):
    """Запускает инструмент аудита в фоне. Возвращает task_id для опроса статуса."""
    if not request.target or not request.target.strip():
        raise HTTPException(status_code=400, detail="Не указана цель")
    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        run_audit_task, task_id, request.tool_id, request.target.strip(),
        request.scan_id, request.options or {},
    )
    return {"task_id": task_id}


@router.get("/{task_id}/status")
async def audit_status(task_id: str):
    """Текущий статус задачи (из памяти, с инкрементальным выводом)."""
    status = get_audit_status(task_id)
    if status:
        return status
    # Задача уже завершилась и выгружена из памяти — отдаём из БД.
    row = get_audit_task(task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return {
        "task_id": row["task_id"],
        "tool_id": row["tool_id"],
        "target": row["target"],
        "scan_id": row.get("scan_id"),
        "status": row["status"],
        "command": row.get("command") or "",
        "output": row.get("output") or "",
        "findings": json.loads(row["findings"]) if row.get("findings") else [],
        "summary": row.get("summary"),
    }


@router.post("/{task_id}/cancel")
async def audit_cancel(task_id: str):
    if not cancel_audit_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не активна")
    return {"message": "Задача остановлена"}


@router.get("/history")
async def audit_history(scan_id: str | None = None, limit: int = 100, offset: int = 0):
    return {"tasks": get_audit_tasks(scan_id, limit, offset)}


@router.get("/task/{task_id}")
async def audit_task_detail(task_id: str):
    row = get_audit_task(task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    row = dict(row)
    row["findings"] = json.loads(row["findings"]) if row.get("findings") else []
    row["options"] = json.loads(row["options"]) if row.get("options") else {}
    return row


@router.delete("/task/{task_id}")
async def audit_task_delete(task_id: str):
    if not delete_audit_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return {"message": "Удалено"}
