# backend/app/routes/schedule.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import json
import uuid
import threading
from datetime import datetime
from app.database import get_schedules, get_schedule, create_schedule, update_schedule, delete_schedule, update_schedule_last_run
from app.scheduler import add_schedule_job, remove_schedule_job, update_schedule_job, reload_schedules
from app.nmap_wrapper import run_scan

router = APIRouter(tags=["schedule"])

class ScheduleCreate(BaseModel):
    name: str
    targets: str
    profile: str
    options: Optional[Dict] = None
    cron_expression: str
    active: bool = True

class ScheduleUpdate(BaseModel):
    name: str
    targets: str
    profile: str
    options: Optional[Dict] = None
    cron_expression: str
    active: bool

@router.get("/")
async def list_schedules():
    return {"schedules": get_schedules()}

@router.get("/{schedule_id}")
async def get_schedule_by_id(schedule_id: int):
    sch = get_schedule(schedule_id)
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return sch

@router.post("/")
async def create_schedule_endpoint(data: ScheduleCreate):
    schedule_id = create_schedule(
        name=data.name,
        targets=data.targets,
        profile=data.profile,
        options=data.options,
        cron_expression=data.cron_expression,
        active=data.active
    )
    if data.active:
        add_schedule_job(schedule_id)
    return {"id": schedule_id}

@router.put("/{schedule_id}")
async def update_schedule_endpoint(schedule_id: int, data: ScheduleUpdate):
    existing = get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    update_schedule(
        schedule_id=schedule_id,
        name=data.name,
        targets=data.targets,
        profile=data.profile,
        options=data.options,
        cron_expression=data.cron_expression,
        active=data.active
    )
    update_schedule_job(schedule_id)
    return {"message": "Updated"}

@router.delete("/{schedule_id}")
async def delete_schedule_endpoint(schedule_id: int):
    deleted = delete_schedule(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
    remove_schedule_job(schedule_id)
    return {"message": "Deleted"}

@router.post("/{schedule_id}/run")
async def run_schedule_now(schedule_id: int):
    schedule = get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    scan_id = str(uuid.uuid4())
    params = {
        "targets": schedule['targets'],
        "profile": schedule['profile'],
        "options": json.loads(schedule['options']) if schedule['options'] else {}
    }
    def target():
        run_scan(scan_id, params)
        update_schedule_last_run(schedule_id, datetime.now().isoformat(), scan_id)
    thread = threading.Thread(target=target)
    thread.start()
    return {"scan_id": scan_id}