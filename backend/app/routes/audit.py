# backend/app/routes/audit.py
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.audit_tools import (
    CATEGORIES,
    TOOLS,
    build_suggestions,
    cancel_audit_task,
    get_audit_status,
    list_tools,
    list_wordlists,
    run_audit_task,
)
from app.database import (
    delete_audit_task,
    get_audit_findings,
    get_audit_task,
    get_audit_tasks,
    get_scan_by_id,
)
from app.models import AuditRunRequest

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/tools")
async def audit_tools():
    """Список поддерживаемых инструментов аудита и их доступность в системе.

    Категории — фазы пентеста (PTES), отсортированы по order; каждая несёт
    phase_hint (когда фазу запускать) и icon для UI.
    """
    return {
        "categories": [
            {
                "id": cat_id,
                "label": meta["label"],
                "order": meta["order"],
                "icon": meta["icon"],
                "phase_hint": meta["phase_hint"],
            }
            for cat_id, meta in sorted(CATEGORIES.items(), key=lambda kv: kv[1]["order"])
        ],
        "tools": list_tools(),
    }


@router.post("/run")
async def audit_run(request: AuditRunRequest, background_tasks: BackgroundTasks):
    """Запускает инструмент аудита в фоне. Возвращает task_id для опроса статуса."""
    tool = TOOLS.get(request.tool_id)
    if tool is None:
        raise HTTPException(status_code=404, detail=f"Неизвестный инструмент: {request.tool_id}")
    # target_kind="none" (crunch и т.п.) — цель не требуется
    if tool.target_kind != "none" and (not request.target or not request.target.strip()):
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


@router.get("/wordlists")
async def audit_wordlists():
    """Списки словарей по категориям: directories, usernames, passwords,
    params, subdomains + generated (созданные cewl/crunch). Кэш 1 час (A4.3)."""
    return {"categories": list_wordlists()}


@router.get("/suggestions")
async def audit_suggestions(scan_id: str):
    """Рекомендуемые следующие шаги на основе открытых портов/сервисов скана
    и технологий из уже выполненных задач аудита (A6)."""
    if not get_scan_by_id(scan_id):
        raise HTTPException(status_code=404, detail="Скан не найден")
    return {"suggestions": build_suggestions(scan_id)}


@router.get("/findings")
async def audit_findings(scan_id: str):
    """Сводная таблица находок по всем завершённым задачам аудита скана (A6)."""
    if not get_scan_by_id(scan_id):
        raise HTTPException(status_code=404, detail="Скан не найден")

    sev_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
    rows: list[dict] = []
    tasks = get_audit_findings(scan_id)
    for task in tasks:
        try:
            findings = json.loads(task.get("findings") or "[]")
        except ValueError:
            findings = []
        for f in findings:
            rows.append({
                "severity": f.get("severity", "info"),
                "title": f.get("title", ""),
                "detail": f.get("detail", ""),
                "source": f.get("source") or task.get("tool_id"),
                "host": f.get("host") or task.get("target", ""),
                "port": f.get("port", ""),
                "task_id": task.get("task_id"),
                "target": task.get("target"),
            })
    rows.sort(key=lambda r: -sev_order.get(r["severity"], 0))

    by_severity: dict[str, int] = {}
    for r in rows:
        by_severity[r["severity"]] = by_severity.get(r["severity"], 0) + 1

    return {
        "findings": rows,
        "by_severity": by_severity,
        "tasks_total": len(tasks),
    }


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

