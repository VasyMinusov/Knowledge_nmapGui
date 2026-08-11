# backend/app/routes/vulnerabilities.py
from fastapi import APIRouter, HTTPException, Query
from app.database import get_vulnerabilities_by_scan, get_all_vulnerabilities, get_vulnerability_stats, get_scan_by_id

router = APIRouter(prefix="/api/vulnerabilities", tags=["vulnerabilities"])

@router.get("/scan/{scan_id}")
async def get_scan_vulnerabilities(scan_id: str):
    """Получить все уязвимости для конкретного скана."""
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    vulns = get_vulnerabilities_by_scan(scan_id)
    return {"scan_id": scan_id, "vulnerabilities": vulns}

@router.get("/all")
async def get_all_vulns(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    """Получить все уязвимости из всех сканов (глобально)."""
    vulns = get_all_vulnerabilities(limit, offset)
    return {"vulnerabilities": vulns, "limit": limit, "offset": offset}

@router.get("/stats")
async def get_stats():
    """Получить статистику по уязвимостям."""
    stats = get_vulnerability_stats()
    return stats