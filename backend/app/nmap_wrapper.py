# backend/app/nmap_wrapper.py
import subprocess
import uuid
import os
import xmltodict
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from .models import HostInfo, PortInfo, ScanStatus
from .database import (
    save_scan, update_scan, init_db, store_scan_hosts,
    store_vulnerabilities, get_host_id_by_ip
)

# Инициализация БД при первом импорте
init_db()

SCAN_DIR = "scans"
os.makedirs(SCAN_DIR, exist_ok=True)

# Хранилище статусов в памяти (для быстрого доступа)
scan_statuses: Dict[str, ScanStatus] = {}
scan_processes: Dict[str, subprocess.Popen] = {}


def build_nmap_args(params: dict) -> List[str]:
    """Собирает аргументы командной строки для nmap на основе параметров."""
    args = ["nmap"]
    profile = params.get("profile")
    options = params.get("options", {})

    if profile == "intense":
        args.extend(["-T4", "-A", "-v"])
    elif profile == "quick":
        args.extend(["-T4", "-F"])
    elif profile == "ping":
        args.extend(["-sn"])
    else:
        # custom – базовый набор
        args.extend(["-T4"])

    if options.get("os_detection"):
        args.append("-O")
    if options.get("version_detection"):
        args.append("-sV")
    if options.get("traceroute"):
        args.append("--traceroute")
    if options.get("scripts"):
        args.extend(["--script", options["scripts"]])

    args.append(params["targets"])
    return args


def parse_nmap_xml(xml_data: str) -> dict:
    """Парсит XML вывод nmap и возвращает словарь с хостами и уязвимостями."""
    data = xmltodict.parse(xml_data)
    hosts = []
    vuln_list = []
    nmap_run = data.get("nmaprun", {})
    host_list = nmap_run.get("host", [])
    
    if not isinstance(host_list, list):
        host_list = [host_list] if host_list else []

    for host in host_list:
        if not isinstance(host, dict):
            continue

        # Адрес
        address = host.get("address")
        if isinstance(address, list):
            ip = address[0].get("@addr", "unknown") if address else "unknown"
        elif isinstance(address, dict):
            ip = address.get("@addr", "unknown")
        else:
            ip = "unknown"

        # Hostname
        hostnames = host.get("hostnames", {})
        hostname_elem = hostnames.get("hostname")
        if isinstance(hostname_elem, list):
            hostname = hostname_elem[0].get("@name") if hostname_elem else None
        elif isinstance(hostname_elem, dict):
            hostname = hostname_elem.get("@name")
        else:
            hostname = None

        # Статус
        status_elem = host.get("status", {})
        if isinstance(status_elem, dict):
            state = status_elem.get("@state", "unknown")
        else:
            state = "unknown"

        # Порты
        ports_elem = host.get("ports", {})
        port_list_raw = ports_elem.get("port", [])
        if not isinstance(port_list_raw, list):
            port_list_raw = [port_list_raw] if port_list_raw else []

        port_list = []
        for p in port_list_raw:
            if not isinstance(p, dict):
                continue
            port_id = int(p.get("@portid", 0))
            protocol = p.get("@protocol", "tcp")
            state_elem = p.get("state", {})
            if isinstance(state_elem, dict):
                state = state_elem.get("@state", "unknown")
            else:
                state = "unknown"
            service_elem = p.get("service", {})
            if isinstance(service_elem, dict):
                service = service_elem.get("@name")
                version = service_elem.get("@version")
            else:
                service = None
                version = None
            port_list.append(PortInfo(
                port=port_id,
                protocol=protocol,
                state=state,
                service=service,
                version=version
            ))

        # OS
        os_elem = host.get("os", {})
        osmatch = os_elem.get("osmatch")
        if isinstance(osmatch, list):
            os_name = osmatch[0].get("@name") if osmatch else None
        elif isinstance(osmatch, dict):
            os_name = osmatch.get("@name")
        else:
            os_name = None

        # Uptime
        uptime_elem = host.get("uptime", {})
        if isinstance(uptime_elem, dict):
            uptime = uptime_elem.get("@seconds")
        else:
            uptime = None

        # Парсинг скриптов (уязвимости)
        scripts = host.get("scripts", {})
        script_list = scripts.get("script", [])
        if not isinstance(script_list, list):
            script_list = [script_list] if script_list else []

        for script in script_list:
            script_id = script.get("@id", "")
            output = script.get("@output", "")
            if script_id == "vuln" or "vuln" in script_id:
                cve_matches = re.findall(r'CVE-\d{4}-\d{4,7}', output)
                cvss_matches = re.findall(r'CVSS:(\d+\.\d+)', output)
                if cve_matches:
                    for cve in cve_matches:
                        cvss = None
                        for cvss_str in cvss_matches:
                            try:
                                cvss = float(cvss_str)
                                break
                            except ValueError:
                                continue
                        vuln_list.append({
                            'ip': ip,
                            'port': None,
                            'protocol': None,
                            'cve': cve,
                            'cvss': cvss,
                            'description': output[:500]
                        })
                elif 'VULNERABILITY' in output.upper():
                    vuln_list.append({
                        'ip': ip,
                        'port': None,
                        'protocol': None,
                        'cve': None,
                        'cvss': None,
                        'description': output[:500]
                    })

        hosts.append(HostInfo(
            ip=ip,
            hostname=hostname,
            status=state,
            ports=port_list,
            os=os_name,
            uptime=uptime
        ))

    # Преобразуем HostInfo в dict для хранения в БД
    hosts_dict = [h.dict() for h in hosts]
    return {"hosts": hosts_dict, "vulnerabilities": vuln_list}


def run_scan(scan_id: str, params: dict):
    """Запускает nmap в подпроцессе, сохраняет XML, парсит и обновляет статус."""
    xml_path = os.path.join(SCAN_DIR, f"{scan_id}.xml")
    args = build_nmap_args(params)
    args.extend(["-oX", xml_path])

    start_time = datetime.now().isoformat()
    targets = params.get("targets")
    profile = params.get("profile")
    options = params.get("options", {})

    # Сохраняем начальную запись в БД
    save_scan(scan_id, targets, profile, options, "running", start_time)

    # Сохраняем статус в памяти
    status = ScanStatus(
        scan_id=scan_id,
        status="running",
        progress=0,
        hosts=[],
        summary="Scanning..."
    )
    scan_statuses[scan_id] = status

    # Запуск процесса
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    scan_processes[scan_id] = process

    stdout, stderr = process.communicate()
    return_code = process.returncode

    # Удаляем процесс из словаря
    scan_processes.pop(scan_id, None)

    end_time = datetime.now().isoformat()
    summary = ""
    final_status = "error"

    if return_code == 0 and os.path.exists(xml_path):
        try:
            with open(xml_path, 'r') as f:
                xml_data = f.read()
            parsed = parse_nmap_xml(xml_data)
            hosts_dict = parsed.get("hosts", [])
            vulns = parsed.get("vulnerabilities", [])
            summary = f"Completed. Found {len(hosts_dict)} hosts."
            final_status = "done"

            # Обновляем статус в памяти
            scan_statuses[scan_id].status = "done"
            scan_statuses[scan_id].progress = 100
            scan_statuses[scan_id].hosts = hosts_dict
            scan_statuses[scan_id].summary = summary

            # Сохраняем результат в БД
            update_scan(scan_id, final_status, end_time, result_path=xml_path, summary=summary)
            # Сохраняем структурированные данные хостов и портов
            store_scan_hosts(scan_id, hosts_dict)

            # Сохраняем уязвимости, привязывая к host_id
            for vuln in vulns:
                host_id = get_host_id_by_ip(scan_id, vuln.get('ip'))
                if host_id:
                    vuln['host_id'] = host_id
                else:
                    # Если хост не найден, пропускаем (возможно, не сохранился)
                    continue
            store_vulnerabilities(scan_id, vulns)

        except Exception as e:
            error_msg = f"Parse error: {str(e)}"
            summary = error_msg
            final_status = "error"
            scan_statuses[scan_id].status = "error"
            scan_statuses[scan_id].summary = error_msg
            update_scan(scan_id, final_status, end_time, summary=error_msg)
    else:
        error_msg = stderr.decode() if stderr else "Unknown error"
        summary = f"Scan failed: {error_msg}"
        final_status = "error"
        scan_statuses[scan_id].status = "error"
        scan_statuses[scan_id].summary = summary
        update_scan(scan_id, final_status, end_time, summary=summary)


def cancel_scan(scan_id: str) -> bool:
    """Отменяет сканирование (отправляет SIGTERM)."""
    process = scan_processes.get(scan_id)
    if process:
        process.terminate()
        if scan_id in scan_statuses:
            scan_statuses[scan_id].status = "error"
            scan_statuses[scan_id].summary = "Cancelled by user"
        end_time = datetime.now().isoformat()
        update_scan(scan_id, "error", end_time, summary="Cancelled by user")
        return True
    return False


def get_scan_status(scan_id: str) -> Optional[ScanStatus]:
    return scan_statuses.get(scan_id)