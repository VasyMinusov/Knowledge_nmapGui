# backend/app/knowledge_base.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import shlex
import re

router = APIRouter(tags=["knowledge"])

# База знаний - расширенный список опций Nmap
OPTIONS_DATA: List[Dict[str, Any]] = [
    # --- Scan Types ---
    {
        "id": "scan_type_sS",
        "category": "scan_types",
        "flag": "-sS",
        "name": "TCP SYN Scan",
        "description": "Сканирование TCP SYN (полуоткрытое). Отправляет SYN-пакет, не завершая трёхстороннее рукопожатие.",
        "example": "nmap -sS 192.168.1.1",
        "use_case": "Быстрое сканирование, менее заметно для IDS/IPS."
    },
    {
        "id": "scan_type_sT",
        "category": "scan_types",
        "flag": "-sT",
        "name": "TCP Connect Scan",
        "description": "Полноценное TCP-соединение (connect). Использует системный вызов connect().",
        "example": "nmap -sT 192.168.1.1",
        "use_case": "Когда нет прав на SYN-сканирование (без raw-пакетов)."
    },
    {
        "id": "scan_type_sU",
        "category": "scan_types",
        "flag": "-sU",
        "name": "UDP Scan",
        "description": "Сканирование UDP-портов. Отправляет пустой UDP-пакет, анализирует ICMP port unreachable.",
        "example": "nmap -sU 192.168.1.1",
        "use_case": "Обнаружение UDP-сервисов (DNS, SNMP, DHCP)."
    },
    {
        "id": "scan_type_sA",
        "category": "scan_types",
        "flag": "-sA",
        "name": "ACK Scan",
        "description": "ACK-сканирование. Отправляет TCP ACK-пакеты, анализирует RST-ответы. Используется для обхода файрволов.",
        "example": "nmap -sA 192.168.1.1",
        "use_case": "Определение правил файрвола (stateful vs stateless)."
    },
    {
        "id": "scan_type_sW",
        "category": "scan_types",
        "flag": "-sW",
        "name": "Window Scan",
        "description": "Сканирование по окну TCP. Анализирует значения Window в RST-пакетах.",
        "example": "nmap -sW 192.168.1.1",
        "use_case": "Обнаружение открытых портов в некоторых системах."
    },
    {
        "id": "scan_type_sM",
        "category": "scan_types",
        "flag": "-sM",
        "name": "Maimon Scan",
        "description": "Maimon-сканирование (FIN/ACK).",
        "example": "nmap -sM 192.168.1.1",
        "use_case": "Обход некоторых IDS."
    },
    # --- Service/Version Detection ---
    {
        "id": "version_detection",
        "category": "service_detection",
        "flag": "-sV",
        "name": "Version Detection",
        "description": "Определение версий сервисов на открытых портах.",
        "example": "nmap -sV 192.168.1.1",
        "use_case": "Точное определение версий приложений для поиска уязвимостей."
    },
    {
        "id": "version_intensity",
        "category": "service_detection",
        "flag": "--version-intensity",
        "name": "Version Intensity",
        "description": "Уровень интенсивности определения версий (0-9). Чем выше, тем больше проб.",
        "example": "nmap -sV --version-intensity 5 192.168.1.1",
        "use_case": "Баланс между скоростью и точностью."
    },
    # --- OS Detection ---
    {
        "id": "os_detection",
        "category": "os_detection",
        "flag": "-O",
        "name": "OS Detection",
        "description": "Определение операционной системы на основе TCP/IP fingerprinting.",
        "example": "nmap -O 192.168.1.1",
        "use_case": "Идентификация ОС для подбора эксплойтов."
    },
    {
        "id": "os_guess",
        "category": "os_detection",
        "flag": "--osscan-guess",
        "name": "OS Guess",
        "description": "Угадывание ОС, даже если не удаётся точно определить.",
        "example": "nmap -O --osscan-guess 192.168.1.1",
        "use_case": "Получение приблизительной ОС."
    },
    # --- Timing ---
    {
        "id": "timing_T0",
        "category": "timing",
        "flag": "-T0",
        "name": "Paranoid Timing",
        "description": "Медленный тайминг (0). Минимизирует обнаружение, сканирование может занять часы.",
        "example": "nmap -T0 192.168.1.1",
        "use_case": "Скрытное сканирование."
    },
    {
        "id": "timing_T1",
        "category": "timing",
        "flag": "-T1",
        "name": "Sneaky Timing",
        "description": "Очень медленный тайминг (1).",
        "example": "nmap -T1 192.168.1.1",
        "use_case": "Скрытное сканирование с некоторой скоростью."
    },
    {
        "id": "timing_T2",
        "category": "timing",
        "flag": "-T2",
        "name": "Polite Timing",
        "description": "Вежливый тайминг (2). Уменьшает нагрузку на сеть.",
        "example": "nmap -T2 192.168.1.1",
        "use_case": "Когда важна деликатность."
    },
    {
        "id": "timing_T3",
        "category": "timing",
        "flag": "-T3",
        "name": "Normal Timing",
        "description": "Стандартный тайминг (3). По умолчанию.",
        "example": "nmap -T3 192.168.1.1",
        "use_case": "Баланс скорости и точности."
    },
    {
        "id": "timing_T4",
        "category": "timing",
        "flag": "-T4",
        "name": "Aggressive Timing",
        "description": "Агрессивный тайминг (4). Ускоряет сканирование, может быть менее точным.",
        "example": "nmap -T4 192.168.1.0/24",
        "use_case": "Когда нужна скорость, точность не критична."
    },
    {
        "id": "timing_T5",
        "category": "timing",
        "flag": "-T5",
        "name": "Insane Timing",
        "description": "Максимальная скорость (5). Может пропускать порты.",
        "example": "nmap -T5 192.168.1.1",
        "use_case": "Очень быстрые сканы, допустимы пропуски."
    },
    # --- Scripts ---
    {
        "id": "scripts_default",
        "category": "scripts",
        "flag": "-sC",
        "name": "Default Scripts",
        "description": "Запускает набор скриптов по умолчанию (эквивалент --script default).",
        "example": "nmap -sC 192.168.1.1",
        "use_case": "Базовое дополнительное сканирование."
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
        "id": "scripts_safe",
        "category": "scripts",
        "flag": "--script safe",
        "name": "Safe Scripts",
        "description": "Безопасные скрипты, не вызывающие сбоев.",
        "example": "nmap --script safe 192.168.1.1",
        "use_case": "Сканирование без риска нарушить работу сервисов."
    },
    {
        "id": "scripts_all",
        "category": "scripts",
        "flag": "--script all",
        "name": "All Scripts",
        "description": "Запускает все доступные скрипты (может быть очень долго).",
        "example": "nmap --script all 192.168.1.1",
        "use_case": "Максимально полное сканирование."
    },
    {
        "id": "script_args",
        "category": "scripts",
        "flag": "--script-args",
        "name": "Script Arguments",
        "description": "Передача аргументов в скрипты.",
        "example": "nmap --script http-title --script-args http-title.url=/admin 192.168.1.1",
        "use_case": "Настройка поведения скриптов."
    },
    # --- Host Discovery ---
    {
        "id": "ping_sweep",
        "category": "host_discovery",
        "flag": "-sn",
        "name": "Ping Sweep",
        "description": "Обнаружение хостов без сканирования портов.",
        "example": "nmap -sn 192.168.1.0/24",
        "use_case": "Быстрое определение живых хостов."
    },
    {
        "id": "no_ping",
        "category": "host_discovery",
        "flag": "-Pn",
        "name": "No Ping",
        "description": "Пропустить обнаружение хостов (считать все цели активными).",
        "example": "nmap -Pn 192.168.1.1",
        "use_case": "Когда хосты не отвечают на ping, но могут быть доступны."
    },
    {
        "id": "port_specification",
        "category": "port_spec",
        "flag": "-p",
        "name": "Port Specification",
        "description": "Указание портов для сканирования (диапазоны, списки).",
        "example": "nmap -p 22,80,443,1000-2000 192.168.1.1",
        "use_case": "Сканирование только определённых портов."
    },
    {
        "id": "fast_scan",
        "category": "port_spec",
        "flag": "-F",
        "name": "Fast Scan",
        "description": "Сканирование только 100 наиболее распространённых портов.",
        "example": "nmap -F 192.168.1.1",
        "use_case": "Быстрое сканирование для предварительной оценки."
    },
    # --- Output ---
    {
        "id": "verbose",
        "category": "output",
        "flag": "-v",
        "name": "Verbose",
        "description": "Увеличение подробности вывода.",
        "example": "nmap -v 192.168.1.1",
        "use_case": "Отладка и мониторинг прогресса."
    },
    {
        "id": "output_normal",
        "category": "output",
        "flag": "-oN",
        "name": "Normal Output",
        "description": "Сохранить результаты в обычном формате.",
        "example": "nmap -oN results.txt 192.168.1.1",
        "use_case": "Сохранение результатов в читаемом виде."
    },
    {
        "id": "output_xml",
        "category": "output",
        "flag": "-oX",
        "name": "XML Output",
        "description": "Сохранить результаты в XML.",
        "example": "nmap -oX results.xml 192.168.1.1",
        "use_case": "Машинно-читаемый формат для интеграции."
    },
    {
        "id": "output_grepable",
        "category": "output",
        "flag": "-oG",
        "name": "Grepable Output",
        "description": "Сохранить результаты в формате, удобном для grep.",
        "example": "nmap -oG results.txt 192.168.1.1",
        "use_case": "Быстрый парсинг с помощью grep."
    },
    # --- Other ---
    {
        "id": "traceroute",
        "category": "network",
        "flag": "--traceroute",
        "name": "Traceroute",
        "description": "Отслеживает маршрут до цели.",
        "example": "nmap --traceroute 192.168.1.1",
        "use_case": "Анализ сетевой топологии и задержек."
    },
    {
        "id": "aggressive_scan",
        "category": "scan_types",
        "flag": "-A",
        "name": "Aggressive Scan",
        "description": "Включает OS detection, version detection, traceroute и скрипты по умолчанию.",
        "example": "nmap -A 192.168.1.1",
        "use_case": "Максимальный сбор информации."
    },
    {
        "id": "reason",
        "category": "misc",
        "flag": "--reason",
        "name": "Reason",
        "description": "Показывает причину, по которой порт помечен как открытый/закрытый.",
        "example": "nmap --reason 192.168.1.1",
        "use_case": "Понимание логики определения состояния порта."
    },
    {
        "id": "open_only",
        "category": "misc",
        "flag": "--open",
        "name": "Open Only",
        "description": "Показывать только открытые порты.",
        "example": "nmap --open 192.168.1.1",
        "use_case": "Сокращение вывода."
    },
    {
        "id": "packet_trace",
        "category": "misc",
        "flag": "--packet-trace",
        "name": "Packet Trace",
        "description": "Отображает отправляемые и получаемые пакеты.",
        "example": "nmap --packet-trace 192.168.1.1",
        "use_case": "Отладка и анализ трафика."
    },
]

@router.get("/options")
async def get_options() -> List[Dict[str, Any]]:
    return OPTIONS_DATA

@router.get("/categories")
async def get_categories() -> List[str]:
    categories = sorted(set(item["category"] for item in OPTIONS_DATA))
    return categories

# --- НОВЫЙ ЭНДПОИНТ: разбор команды ---

def parse_nmap_command(command: str) -> List[Dict[str, Any]]:
    """
    Разбирает строку команды nmap, возвращает список найденных флагов с их аргументами.
    """
    # Удаляем 'nmap' в начале, если есть
    cmd = command.strip()
    if cmd.startswith("nmap"):
        cmd = cmd[4:].strip()
    
    # Разбиваем с учётом кавычек
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        # Если ошибка парсинга, пробуем простой split
        tokens = cmd.split()
    
    # Проходим по токенам, ищем флаги
    flags_found = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        # Если токен начинается с '-' (флаг)
        if token.startswith('-'):
            # Ищем описание в базе знаний
            option = next((opt for opt in OPTIONS_DATA if opt['flag'] == token), None)
            if option:
                # Проверяем, есть ли аргумент у флага (следующий токен не начинается с '-')
                arg = None
                if i + 1 < len(tokens) and not tokens[i+1].startswith('-'):
                    arg = tokens[i+1]
                    i += 1  # пропускаем аргумент
                flags_found.append({
                    'flag': token,
                    'arg': arg,
                    'option': option
                })
            else:
                # Неизвестный флаг – просто сохраняем
                flags_found.append({
                    'flag': token,
                    'arg': None,
                    'option': None
                })
        i += 1
    
    return flags_found

@router.post("/explain")
async def explain_command(payload: Dict[str, str]):
    """
    Принимает команду nmap, возвращает расшифровку каждого флага.
    """
    command = payload.get('command', '').strip()
    if not command:
        raise HTTPException(status_code=400, detail="Command is required")
    
    parsed = parse_nmap_command(command)
    
    # Формируем ответ: массив объектов с флагом, аргументом и описанием (если найдено)
    result = []
    for item in parsed:
        if item['option']:
            result.append({
                'flag': item['flag'],
                'arg': item['arg'],
                'name': item['option']['name'],
                'description': item['option']['description'],
                'category': item['option']['category'],
                'example': item['option'].get('example'),
                'use_case': item['option'].get('use_case'),
            })
        else:
            result.append({
                'flag': item['flag'],
                'arg': item['arg'],
                'name': None,
                'description': 'Unknown flag',
                'category': 'unknown',
                'example': None,
                'use_case': None,
            })
    
    # Также можно добавить краткое описание команды в целом
    summary = f"Команда содержит {len(result)} флаг(ов)."
    return {
        'command': command,
        'summary': summary,
        'flags': result
    }