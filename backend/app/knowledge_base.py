# backend/app/knowledge_base.py
from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(tags=["knowledge"])

# База знаний - список опций Nmap
OPTIONS_DATA: List[Dict[str, Any]] = [
    {
        "id": "scan_type",
        "category": "scan_types",
        "flag": "-sS",
        "name": "TCP SYN Scan",
        "description": "Сканирование TCP SYN (полуоткрытое). Это стандартный и наиболее популярный тип сканирования. Отправляет SYN-пакет и, получив SYN-ACK, считает порт открытым, но не завершает трёхстороннее рукопожатие.",
        "example": "nmap -sS 192.168.1.1",
        "use_case": "Быстрое сканирование портов без завершения соединения, менее заметно для IDS/IPS."
    },
    {
        "id": "scan_type_tcp",
        "category": "scan_types",
        "flag": "-sT",
        "name": "TCP Connect Scan",
        "description": "Полноценное TCP-соединение (connect). Использует системный вызов connect() для установления соединения. Более заметно, но не требует прав root.",
        "example": "nmap -sT 192.168.1.1",
        "use_case": "Когда нет прав на SYN-сканирование (без raw-пакетов)."
    },
    {
        "id": "scan_type_udp",
        "category": "scan_types",
        "flag": "-sU",
        "name": "UDP Scan",
        "description": "Сканирование UDP-портов. Отправляет пустой UDP-пакет (или с данными) и анализирует ответы (ICMP port unreachable). Медленное из-за ограничений ICMP.",
        "example": "nmap -sU 192.168.1.1",
        "use_case": "Обнаружение UDP-сервисов (DNS, SNMP, DHCP)."
    },
    {
        "id": "version_detection",
        "category": "service_detection",
        "flag": "-sV",
        "name": "Version Detection",
        "description": "Определение версий сервисов. После обнаружения открытых портов, nmap опрашивает их для получения баннера и определяет версию ПО.",
        "example": "nmap -sV 192.168.1.1",
        "use_case": "Точное определение версий приложений для поиска уязвимостей."
    },
    {
        "id": "os_detection",
        "category": "os_detection",
        "flag": "-O",
        "name": "OS Detection",
        "description": "Определение операционной системы на основе анализа стека TCP/IP (TCP/IP fingerprinting).",
        "example": "nmap -O 192.168.1.1",
        "use_case": "Идентификация ОС для подбора эксплойтов."
    },
    {
        "id": "timing_aggressive",
        "category": "timing",
        "flag": "-T4",
        "name": "Aggressive Timing",
        "description": "Устанавливает агрессивный тайминг (-T4). Ускоряет сканирование за счёт меньших таймаутов и параллельности, но может быть менее точным.",
        "example": "nmap -T4 192.168.1.0/24",
        "use_case": "Когда нужна скорость, а точность не критична (например, широкий диапазон)."
    },
    {
        "id": "timing_paranoid",
        "category": "timing",
        "flag": "-T0",
        "name": "Paranoid Timing",
        "description": "Медленный тайминг (-T0). Минимизирует обнаружение, но сканирование может занять часы.",
        "example": "nmap -T0 192.168.1.1",
        "use_case": "Скрытное сканирование, когда важна незаметность."
    },
    {
        "id": "traceroute",
        "category": "network",
        "flag": "--traceroute",
        "name": "Traceroute",
        "description": "Отслеживает маршрут до цели, используя ICMP или UDP. Показывает каждый хоп.",
        "example": "nmap --traceroute 192.168.1.1",
        "use_case": "Анализ сетевой топологии и задержек."
    },
    {
        "id": "scripts_default",
        "category": "scripts",
        "flag": "--script default",
        "name": "Default Scripts",
        "description": "Запускает набор скриптов по умолчанию. Это безопасные и информативные скрипты для базового сканирования.",
        "example": "nmap -sC 192.168.1.1",
        "use_case": "Быстрое получение дополнительной информации (версии, уязвимости)."
    },
    {
        "id": "scripts_vuln",
        "category": "scripts",
        "flag": "--script vuln",
        "name": "Vulnerability Scripts",
        "description": "Запускает скрипты, проверяющие известные уязвимости.",
        "example": "nmap --script vuln 192.168.1.1",
        "use_case": "Поиск уязвимостей в обнаруженных сервисах."
    },
    {
        "id": "ping_sweep",
        "category": "host_discovery",
        "flag": "-sn",
        "name": "Ping Sweep",
        "description": "Обнаружение хостов (ICMP echo, TCP SYN на 443, и т.д.) без сканирования портов.",
        "example": "nmap -sn 192.168.1.0/24",
        "use_case": "Быстрое обнаружение живых хостов в подсети."
    },
    {
        "id": "aggressive_scan",
        "category": "scan_types",
        "flag": "-A",
        "name": "Aggressive Scan",
        "description": "Включает OS detection (-O), version detection (-sV), traceroute (--traceroute) и скрипты по умолчанию (-sC).",
        "example": "nmap -A 192.168.1.1",
        "use_case": "Максимальный сбор информации за один проход (рекомендуется для целей пентеста)."
    },
]

@router.get("/options")
async def get_options() -> List[Dict[str, Any]]:
    return OPTIONS_DATA

@router.get("/categories")
async def get_categories() -> List[str]:
    categories = sorted(set(item["category"] for item in OPTIONS_DATA))
    return categories