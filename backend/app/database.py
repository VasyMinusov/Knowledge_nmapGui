# backend/app/database.py
import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = "nmap_panel.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Таблица истории сканов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT UNIQUE NOT NULL,
            targets TEXT NOT NULL,
            profile TEXT NOT NULL,
            options TEXT,
            status TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            result_path TEXT,
            summary TEXT
        )
    ''')
    
    # Таблица пресетов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            targets TEXT,
            profile TEXT NOT NULL,
            options TEXT,
            description TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Таблица расписаний
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            targets TEXT NOT NULL,
            profile TEXT NOT NULL,
            options TEXT,
            cron_expression TEXT NOT NULL,
            active BOOLEAN DEFAULT 1,
            created_at TEXT NOT NULL,
            last_run TEXT,
            last_scan_id TEXT
        )
    ''')

    # НОВЫЕ ТАБЛИЦЫ для хранения структурированных результатов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            ip TEXT NOT NULL,
            hostname TEXT,
            status TEXT,
            os TEXT,
            uptime INTEGER,
            FOREIGN KEY (scan_id) REFERENCES scans(scan_id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            host_id INTEGER NOT NULL,
            port INTEGER NOT NULL,
            protocol TEXT NOT NULL,
            state TEXT NOT NULL,
            service TEXT,
            version TEXT,
            FOREIGN KEY (host_id) REFERENCES scan_hosts(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vulnerabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            host_id INTEGER NOT NULL,
            port INTEGER,
            protocol TEXT,
            cve TEXT,
            cvss REAL,
            description TEXT,
            FOREIGN KEY (scan_id) REFERENCES scans(scan_id) ON DELETE CASCADE,
            FOREIGN KEY (host_id) REFERENCES scan_hosts(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

# --- Существующие функции (без изменений) ---
def save_scan(scan_id: str, targets: str, profile: str, options: Optional[Dict], status: str, start_time: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scans (scan_id, targets, profile, options, status, start_time) VALUES (?, ?, ?, ?, ?, ?)",
        (scan_id, targets, profile, json.dumps(options) if options else None, status, start_time)
    )
    conn.commit()
    conn.close()

def update_scan(scan_id: str, status: str, end_time: str, result_path: Optional[str] = None, summary: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE scans SET status = ?, end_time = ?, result_path = ?, summary = ? WHERE scan_id = ?",
        (status, end_time, result_path, summary, scan_id)
    )
    conn.commit()
    conn.close()

def get_scans(limit: int = 50, offset: int = 0) -> List[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM scans ORDER BY start_time DESC LIMIT ? OFFSET ?",
        (limit, offset)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_scan_by_id(scan_id: str) -> Optional[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE scan_id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_scan(scan_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scans WHERE scan_id = ?", (scan_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Функции для пресетов ---
def create_preset(name: str, profile: str, options: Optional[Dict], targets: Optional[str] = None, description: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO presets (name, targets, profile, options, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (name, targets, profile, json.dumps(options) if options else None, description, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_presets() -> List[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM presets ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_preset(preset_id: int) -> Optional[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM presets WHERE id = ?", (preset_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_preset(preset_id: int, name: str, targets: Optional[str], profile: str, options: Optional[Dict], description: Optional[str]):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE presets SET name = ?, targets = ?, profile = ?, options = ?, description = ? WHERE id = ?",
        (name, targets, profile, json.dumps(options) if options else None, description, preset_id)
    )
    conn.commit()
    conn.close()

def delete_preset(preset_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM presets WHERE id = ?", (preset_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Функции для расписаний ---
def get_schedules() -> List[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schedules ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_schedule(schedule_id: int) -> Optional[Dict]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_schedule(name: str, targets: str, profile: str, options: Optional[Dict], cron_expression: str, active: bool = True):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO schedules (name, targets, profile, options, cron_expression, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (name, targets, profile, json.dumps(options) if options else None, cron_expression, 1 if active else 0, datetime.now().isoformat())
    )
    conn.commit()
    schedule_id = cursor.lastrowid
    conn.close()
    return schedule_id

def update_schedule(schedule_id: int, name: str, targets: str, profile: str, options: Optional[Dict], cron_expression: str, active: bool):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE schedules SET name = ?, targets = ?, profile = ?, options = ?, cron_expression = ?, active = ? WHERE id = ?",
        (name, targets, profile, json.dumps(options) if options else None, cron_expression, 1 if active else 0, schedule_id)
    )
    conn.commit()
    conn.close()

def delete_schedule(schedule_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def update_schedule_last_run(schedule_id: int, last_run: str, last_scan_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE schedules SET last_run = ?, last_scan_id = ? WHERE id = ?",
        (last_run, last_scan_id, schedule_id)
    )
    conn.commit()
    conn.close()

# --- НОВЫЕ ФУНКЦИИ ДЛЯ СТРУКТУРИРОВАННЫХ РЕЗУЛЬТАТОВ ---

def store_scan_hosts(scan_id: str, hosts: List[Dict]):
    """Сохраняет хосты и порты из распарсенных данных в БД."""
    conn = get_db()
    cursor = conn.cursor()
    # Удаляем старые записи для этого scan_id (если перезапуск)
    cursor.execute("DELETE FROM scan_hosts WHERE scan_id = ?", (scan_id,))
    for host in hosts:
        cursor.execute(
            "INSERT INTO scan_hosts (scan_id, ip, hostname, status, os, uptime) VALUES (?, ?, ?, ?, ?, ?)",
            (scan_id, host.get('ip'), host.get('hostname'), host.get('status'), host.get('os'), host.get('uptime'))
        )
        host_id = cursor.lastrowid
        for port in host.get('ports', []):
            cursor.execute(
                "INSERT INTO scan_ports (host_id, port, protocol, state, service, version) VALUES (?, ?, ?, ?, ?, ?)",
                (host_id, port.get('port'), port.get('protocol'), port.get('state'), port.get('service'), port.get('version'))
            )
    conn.commit()
    conn.close()

def get_hosts_by_scan(scan_id: str) -> List[Dict]:
    """Возвращает список хостов с портами для заданного scan_id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scan_hosts WHERE scan_id = ?", (scan_id,))
    hosts_rows = cursor.fetchall()
    result = []
    for host_row in hosts_rows:
        host = dict(host_row)
        cursor.execute("SELECT * FROM scan_ports WHERE host_id = ?", (host['id'],))
        ports_rows = cursor.fetchall()
        host['ports'] = [dict(p) for p in ports_rows]
        result.append(host)
    conn.close()
    return result

def get_vulnerabilities_by_scan(scan_id: str) -> List[Dict]:
    """Возвращает все уязвимости для данного скана с информацией о хосте."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT v.*, h.ip, h.hostname, h.os 
        FROM vulnerabilities v
        JOIN scan_hosts h ON v.host_id = h.id
        WHERE v.scan_id = ?
        ORDER BY v.cvss DESC
    """, (scan_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_vulnerabilities(limit: int = 100, offset: int = 0) -> List[Dict]:
    """Возвращает все уязвимости из всех сканов с пагинацией."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT v.*, h.ip, h.hostname, h.os, s.scan_id, s.start_time
        FROM vulnerabilities v
        JOIN scan_hosts h ON v.host_id = h.id
        JOIN scans s ON v.scan_id = s.scan_id
        ORDER BY v.cvss DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_vulnerability_stats() -> Dict:
    """Агрегированная статистика по уязвимостям."""
    conn = get_db()
    cursor = conn.cursor()
    stats = {}
    cursor.execute("SELECT COUNT(*) FROM vulnerabilities")
    stats['total'] = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT cve) FROM vulnerabilities WHERE cve IS NOT NULL")
    stats['unique_cves'] = cursor.fetchone()[0]
    cursor.execute("SELECT AVG(cvss) FROM vulnerabilities WHERE cvss IS NOT NULL")
    stats['avg_cvss'] = cursor.fetchone()[0] or 0
    cursor.execute("""
        SELECT COUNT(*) FROM vulnerabilities WHERE cvss >= 7.0
    """)
    stats['high'] = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(*) FROM vulnerabilities WHERE cvss >= 4.0 AND cvss < 7.0
    """)
    stats['medium'] = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(*) FROM vulnerabilities WHERE cvss < 4.0
    """)
    stats['low'] = cursor.fetchone()[0]
    conn.close()
    return stats