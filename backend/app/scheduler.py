# backend/app/scheduler.py
import json
import uuid
import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.base import JobLookupError
from .database import get_schedules, get_schedule, update_schedule_last_run
from .nmap_wrapper import run_scan

scheduler = BackgroundScheduler()
scheduler.start()

def run_scheduled_scan(schedule_id: int, params: dict):
    """Запускает сканирование по расписанию в отдельном потоке."""
    scan_id = str(uuid.uuid4())
    def target():
        run_scan(scan_id, params)
        update_schedule_last_run(schedule_id, datetime.now().isoformat(), scan_id)
    thread = threading.Thread(target=target)
    thread.start()

def schedule_job(schedule: dict):
    """Добавляет задачу в планировщик, если активна."""
    schedule_id = schedule['id']
    cron = schedule['cron_expression']
    if not cron:
        return
    parts = cron.split()
    if len(parts) != 5:
        return
    minute, hour, day, month, day_of_week = parts
    trigger = CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=day_of_week)
    params = {
        "targets": schedule['targets'],
        "profile": schedule['profile'],
        "options": json.loads(schedule['options']) if schedule['options'] else {}
    }
    if schedule.get('active', 0):
        job_id = f"schedule_{schedule_id}"
        try:
            scheduler.add_job(
                run_scheduled_scan,
                trigger=trigger,
                args=[schedule_id, params],
                id=job_id,
                replace_existing=True
            )
        except Exception as e:
            print(f"Error adding job {job_id}: {e}")

def reload_schedules():
    """Перезагружает все задачи из БД."""
    for job in scheduler.get_jobs():
        if job.id.startswith("schedule_"):
            scheduler.remove_job(job.id)
    schedules = get_schedules()
    for sch in schedules:
        schedule_job(sch)

def add_schedule_job(schedule_id: int):
    schedule = get_schedule(schedule_id)
    if schedule:
        schedule_job(schedule)

def remove_schedule_job(schedule_id: int):
    job_id = f"schedule_{schedule_id}"
    try:
        scheduler.remove_job(job_id)
    except JobLookupError:
        pass

def update_schedule_job(schedule_id: int):
    remove_schedule_job(schedule_id)
    add_schedule_job(schedule_id)

# Инициализация при запуске
reload_schedules()