# backend/app/routes/topology.py
import os
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..database import get_scan_by_id, get_hosts_by_scan
from ..nmap_wrapper import parse_nmap_xml
import xmltodict

router = APIRouter(prefix="/api/scan/topology", tags=["topology"])

def extract_topology_from_xml(xml_data: str) -> Dict[str, List[Dict]]:
    """
    Извлекает из XML данные traceroute для построения графа.
    Возвращает словарь с узлами и рёбрами.
    """
    try:
        data = xmltodict.parse(xml_data)
        nmap_run = data.get("nmaprun", {})
        hosts = nmap_run.get("host", [])
        if not isinstance(hosts, list):
            hosts = [hosts] if hosts else []
    except Exception:
        return {"nodes": [], "edges": []}

    nodes = []
    edges = []
    # Собираем все уникальные IP-адреса из hop'ов
    all_ips = set()
    hop_sequences = []  # список списков hop'ов для каждого хоста

    for host in hosts:
        if not isinstance(host, dict):
            continue
        trace = host.get("trace")
        if not trace:
            continue
        hops = trace.get("hop")
        if not hops:
            continue
        if not isinstance(hops, list):
            hops = [hops]
        # Сортируем по ttl
        hops_sorted = sorted(hops, key=lambda h: int(h.get("@ttl", 0)))
        hop_ips = []
        for hop in hops_sorted:
            ip = hop.get("@ipaddr")
            if ip:
                hop_ips.append(ip)
                all_ips.add(ip)
        if hop_ips:
            hop_sequences.append(hop_ips)

    # Добавляем узлы для всех уникальных IP
    for ip in all_ips:
        nodes.append({
            "data": {
                "id": ip,
                "label": ip,
                "group": "router"  # или "unknown" пока не знаем
            }
        })

    # Добавляем рёбра между последовательными hop'ами
    edge_id = 0
    for seq in hop_sequences:
        for i in range(len(seq) - 1):
            source = seq[i]
            target = seq[i+1]
            # Проверяем, что оба узла существуют
            if source in all_ips and target in all_ips:
                # Добавляем уникальное ребро
                edge_id += 1
                edges.append({
                    "data": {
                        "id": f"edge-{edge_id}",
                        "source": source,
                        "target": target,
                        "delay": None  # можно извлечь rtt, но для простоты оставим
                    }
                })

    return {"nodes": nodes, "edges": edges}


@router.get("/{scan_id}")
async def get_topology(scan_id: str) -> Dict[str, Any]:
    """
    Возвращает данные для построения графа топологии.
    Сначала пытается извлечь traceroute из XML, если есть.
    Если нет, строит граф на основе подсетей (группировка /24).
    """
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result_path = scan.get('result_path')
    hosts_from_db = get_hosts_by_scan(scan_id)

    # Если XML существует и содержит traceroute, используем его
    if result_path and os.path.exists(result_path):
        with open(result_path, 'r') as f:
            xml_data = f.read()
        topology = extract_topology_from_xml(xml_data)
        # Если есть узлы, возвращаем их
        if topology["nodes"]:
            return {
                "nodes": topology["nodes"],
                "edges": topology["edges"],
                "hosts": hosts_from_db,
                "source": "traceroute"
            }

    # Если traceroute нет, строим граф по подсетям /24 (как в HostGrid)
    nodes = []
    edges = []
    subnet_map = {}
    for host in hosts_from_db:
        ip = host.get('ip')
        if not ip:
            continue
        parts = ip.split('.')
        if len(parts) == 4:
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
            if subnet not in subnet_map:
                subnet_map[subnet] = []
            subnet_map[subnet].append(ip)
        else:
            # IPv6 или другие – просто добавляем хост как узел
            nodes.append({
                "data": {
                    "id": ip,
                    "label": ip,
                    "group": "host",
                    "status": host.get('status', 'unknown'),
                    "os": host.get('os'),
                    "hostname": host.get('hostname')
                }
            })

    # Создаём узлы подсетей и рёбра
    for subnet, ips in subnet_map.items():
        subnet_id = f"subnet-{subnet}"
        nodes.append({
            "data": {
                "id": subnet_id,
                "label": subnet,
                "group": "router",
                "status": "up"
            }
        })
        for ip in ips:
            # Узел хоста (если ещё не добавлен)
            if not any(n["data"]["id"] == ip for n in nodes):
                host = next((h for h in hosts_from_db if h['ip'] == ip), None)
                nodes.append({
                    "data": {
                        "id": ip,
                        "label": ip,
                        "group": "host",
                        "status": host.get('status', 'unknown') if host else 'unknown',
                        "os": host.get('os') if host else None,
                        "hostname": host.get('hostname') if host else None
                    }
                })
            edges.append({
                "data": {
                    "id": f"edge-{subnet_id}-{ip}",
                    "source": subnet_id,
                    "target": ip,
                    "delay": None
                }
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "hosts": hosts_from_db,
        "source": "subnet" if nodes else "none"
    }