from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
from typing import Optional
from fastapi.responses import Response
import os

from app.models import ScanRequest, ScanStatus
from app.nmap_wrapper import run_scan, get_scan_status, cancel_scan, parse_nmap_xml
from app.database import get_scans, get_scan_by_id, delete_scan, get_presets, get_preset, create_preset, update_preset, delete_preset
from app.report_generator import generate_report



router = APIRouter()

@router.post("/start")
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    background_tasks.add_task(run_scan, scan_id, request.dict())
    return {"scan_id": scan_id}

@router.get("/{scan_id}/status")
async def scan_status(scan_id: str):
    status = get_scan_status(scan_id)
    if not status:
        raise HTTPException(status_code=404, detail="Scan not found")
    return status

@router.post("/{scan_id}/cancel")
async def cancel(scan_id: str):
    success = cancel_scan(scan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not active")
    return {"message": "Scan cancelled"}

@router.get("/history")
async def history(limit: int = 50, offset: int = 0):
    scans = get_scans(limit, offset)
    return {"scans": scans}

@router.get("/history/{scan_id}")
async def get_scan_result(scan_id: str):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/history/{scan_id}/hosts")
async def get_scan_hosts(scan_id: str):
    """Возвращает список хостов для указанного скана."""
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    result_path = scan.get('result_path')
    if not result_path or not os.path.exists(result_path):
        return {"hosts": []}
    with open(result_path, 'r') as f:
        xml_data = f.read()
    parsed = parse_nmap_xml(xml_data)
    hosts_objects = parsed.get('hosts', [])  # список объектов HostInfo
    # Преобразуем в словари для сериализации
    hosts_dict = [h.dict() for h in hosts_objects]
    return {"hosts": hosts_dict}

@router.delete("/history/{scan_id}")
async def delete_scan_history(scan_id: str):
    deleted = delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"message": "Deleted"}

# Пресеты
@router.get("/presets")
async def list_presets():
    return {"presets": get_presets()}

@router.get("/presets/{preset_id}")
async def get_preset_by_id(preset_id: int):
    preset = get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset

@router.post("/presets")
async def create_new_preset(name: str, profile: str, targets: Optional[str] = None, options: Optional[dict] = None, description: Optional[str] = None):
    create_preset(name, profile, options, targets, description)
    return {"message": "Preset created"}

@router.put("/presets/{preset_id}")
async def update_preset_by_id(preset_id: int, name: str, profile: str, targets: Optional[str] = None, options: Optional[dict] = None, description: Optional[str] = None):
    update_preset(preset_id, name, targets, profile, options, description)
    return {"message": "Preset updated"}

@router.delete("/presets/{preset_id}")
async def delete_preset_by_id(preset_id: int):
    deleted = delete_preset(preset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"message": "Preset deleted"}

# Генерация отчёта
@router.get("/{scan_id}/report")
async def download_report(scan_id: str, format: str = "html"):
    filename, content, media_type = generate_report(scan_id, format)
    if not filename:
        raise HTTPException(status_code=404, detail="Scan not found or no results")
    return Response(content=content, media_type=media_type, headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })