# backend/app/routes/compare.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..database import get_hosts_by_scan, get_scan_by_id

router = APIRouter(prefix="/api/scan/compare", tags=["compare"])

def compute_diff(hosts1: List[Dict], hosts2: List[Dict]) -> Dict[str, Any]:
    """Сравнивает два списка хостов и возвращает структуру diff."""
    # Создаём словари для быстрого поиска по IP
    map1 = {h['ip']: h for h in hosts1}
    map2 = {h['ip']: h for h in hosts2}
    
    added = []
    removed = []
    modified = []
    
    # Хосты, которые есть только в первом скане
    for ip, host in map1.items():
        if ip not in map2:
            removed.append(host)
    
    # Хосты, которые есть только во втором
    for ip, host in map2.items():
        if ip not in map1:
            added.append(host)
    
    # Хосты, присутствующие в обоих
    for ip, host1 in map1.items():
        if ip in map2:
            host2 = map2[ip]
            changes = {}
            # Сравниваем поля
            if host1.get('status') != host2.get('status'):
                changes['status'] = {'old': host1.get('status'), 'new': host2.get('status')}
            if host1.get('os') != host2.get('os'):
                changes['os'] = {'old': host1.get('os'), 'new': host2.get('os')}
            if host1.get('uptime') != host2.get('uptime'):
                changes['uptime'] = {'old': host1.get('uptime'), 'new': host2.get('uptime')}
            # Сравниваем порты (по port+protocol)
            ports1 = {f"{p['port']}/{p['protocol']}": p for p in host1.get('ports', [])}
            ports2 = {f"{p['port']}/{p['protocol']}": p for p in host2.get('ports', [])}
            ports_added = []
            ports_removed = []
            ports_modified = []
            for key, p1 in ports1.items():
                if key not in ports2:
                    ports_removed.append(p1)
                else:
                    p2 = ports2[key]
                    if p1.get('state') != p2.get('state') or p1.get('service') != p2.get('service') or p1.get('version') != p2.get('version'):
                        ports_modified.append({'old': p1, 'new': p2})
            for key, p2 in ports2.items():
                if key not in ports1:
                    ports_added.append(p2)
            if ports_added or ports_removed or ports_modified:
                changes['ports'] = {
                    'added': ports_added,
                    'removed': ports_removed,
                    'modified': ports_modified
                }
            if changes:
                modified.append({
                    'ip': ip,
                    'changes': changes,
                    'host1': host1,
                    'host2': host2
                })
    
    return {
        'added': added,
        'removed': removed,
        'modified': modified
    }

@router.post("/")
async def compare_scans(payload: Dict[str, str]):
    scan_id_1 = payload.get('scan_id_1')
    scan_id_2 = payload.get('scan_id_2')
    if not scan_id_1 or not scan_id_2:
        raise HTTPException(status_code=400, detail="Both scan_id_1 and scan_id_2 are required")
    
    # Проверяем, что сканы существуют
    scan1 = get_scan_by_id(scan_id_1)
    scan2 = get_scan_by_id(scan_id_2)
    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="One or both scans not found")
    
    hosts1 = get_hosts_by_scan(scan_id_1)
    hosts2 = get_hosts_by_scan(scan_id_2)
    
    diff = compute_diff(hosts1, hosts2)
    
    # Добавляем информацию о сканах для отображения
    return {
        'scan1': {'id': scan_id_1, 'targets': scan1['targets'], 'start_time': scan1['start_time']},
        'scan2': {'id': scan_id_2, 'targets': scan2['targets'], 'start_time': scan2['start_time']},
        'diff': diff
    }