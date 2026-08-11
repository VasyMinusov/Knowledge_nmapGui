# backend/app/routes/analytics.py
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview")
async def get_overview() -> Dict[str, Any]:
    """Общая статистика: количество сканов, хостов, портов, уязвимостей."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Всего сканов
    cursor.execute("SELECT COUNT(*) FROM scans")
    total_scans = cursor.fetchone()[0]
    
    # Всего хостов (уникальных ip)
    cursor.execute("SELECT COUNT(DISTINCT ip) FROM scan_hosts")
    total_hosts = cursor.fetchone()[0]
    
    # Всего портов (открытых)
    cursor.execute("SELECT COUNT(*) FROM scan_ports WHERE state = 'open'")
    total_open_ports = cursor.fetchone()[0]
    
    # Всего уязвимостей
    cursor.execute("SELECT COUNT(*) FROM vulnerabilities")
    total_vulns = cursor.fetchone()[0]
    
    # Уникальных CVE
    cursor.execute("SELECT COUNT(DISTINCT cve) FROM vulnerabilities WHERE cve IS NOT NULL")
    unique_cves = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total_scans": total_scans,
        "total_hosts": total_hosts,
        "total_open_ports": total_open_ports,
        "total_vulnerabilities": total_vulns,
        "unique_cves": unique_cves,
    }

@router.get("/services")
async def get_top_services(limit: int = Query(10, ge=1, le=50)) -> List[Dict[str, Any]]:
    """Топ сервисов по количеству открытых портов."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT service, COUNT(*) as count
        FROM scan_ports
        WHERE state = 'open' AND service IS NOT NULL AND service != ''
        GROUP BY service
        ORDER BY count DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{"service": row[0], "count": row[1]} for row in rows]

@router.get("/os")
async def get_os_distribution() -> List[Dict[str, Any]]:
    """Распределение операционных систем среди хостов."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT os, COUNT(*) as count
        FROM scan_hosts
        WHERE os IS NOT NULL AND os != ''
        GROUP BY os
        ORDER BY count DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    # Ограничим топ-10, остальное объединим в "Other"
    if len(rows) > 10:
        top = rows[:10]
        other_count = sum(row[1] for row in rows[10:])
        top.append(("Other", other_count))
        rows = top
    return [{"os": row[0] or "Unknown", "count": row[1]} for row in rows]

@router.get("/ports")
async def get_top_ports(limit: int = Query(10, ge=1, le=50)) -> List[Dict[str, Any]]:
    """Топ открытых портов."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT port, protocol, COUNT(*) as count
        FROM scan_ports
        WHERE state = 'open'
        GROUP BY port, protocol
        ORDER BY count DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{"port": row[0], "protocol": row[1], "count": row[2]} for row in rows]

@router.get("/timeline")
async def get_timeline(days: int = Query(30, ge=1, le=365)) -> List[Dict[str, Any]]:
    """Количество хостов и открытых портов по дням за последние N дней."""
    conn = get_db()
    cursor = conn.cursor()
    # Дата начала
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Получаем данные по дням: количество хостов (по сканам) и портов
    # Сначала получим все сканы за период
    cursor.execute("""
        SELECT scan_id, start_time
        FROM scans
        WHERE start_time >= ?
        ORDER BY start_time
    """, (start_date,))
    scans = cursor.fetchall()
    
    # Для каждого дня суммируем хосты и порты
    date_map = {}
    for scan_id, start_time in scans:
        date_str = start_time[:10]  # YYYY-MM-DD
        if date_str not in date_map:
            date_map[date_str] = {"hosts": 0, "ports": 0}
        # Получаем количество хостов для этого скана
        cursor.execute("SELECT COUNT(*) FROM scan_hosts WHERE scan_id = ?", (scan_id,))
        hosts_count = cursor.fetchone()[0]
        date_map[date_str]["hosts"] += hosts_count
        # Получаем количество открытых портов для этого скана
        cursor.execute("""
            SELECT COUNT(*) FROM scan_ports 
            WHERE host_id IN (SELECT id FROM scan_hosts WHERE scan_id = ?) 
            AND state = 'open'
        """, (scan_id,))
        ports_count = cursor.fetchone()[0]
        date_map[date_str]["ports"] += ports_count
    
    conn.close()
    
    # Преобразуем в список, сортируем по дате
    result = []
    for date_str in sorted(date_map.keys()):
        result.append({
            "date": date_str,
            "hosts": date_map[date_str]["hosts"],
            "ports": date_map[date_str]["ports"]
        })
    return result