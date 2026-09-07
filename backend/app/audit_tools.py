# backend/app/audit_tools.py
"""
Инструментарий дальнейшего аудита: запуск внешних утилит пентеста и анализа сайта
по образцу app/nmap_wrapper.py.

Каждый инструмент описан декларативно в TOOLS. Запуск — только через список
аргументов (без shell=True), с валидацией цели, ограничением объёма вывода и
таймаутом. Результат парсится в список findings и сохраняется в БД.
"""
import os
import re
import shutil
import subprocess
import threading
from datetime import datetime
from typing import Callable, Dict, List, Optional

from app.database import (
    init_db,
    save_audit_task,
    update_audit_task,
)
from app.models import AuditTaskStatus

init_db()

# ── Каталоги ──────────────────────────────────────────────────────────────────
AUDIT_DIR = "audit_runs"
os.makedirs(AUDIT_DIR, exist_ok=True)

_BUNDLED_WORDLIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wordlists", "common.txt")
_SYSTEM_WORDLISTS = [
    "/usr/share/wordlists/dirb/common.txt",
    "/usr/share/seclists/Discovery/Web-Content/common.txt",
    "/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt",
]

# Предел объёма вывода одного инструмента, чтобы не переполнить память (символы).
MAX_OUTPUT_CHARS = 512 * 1024

# ── Состояние в памяти ────────────────────────────────────────────────────────
audit_statuses: Dict[str, AuditTaskStatus] = {}
audit_processes: Dict[str, subprocess.Popen] = {}
_audit_cancelled: set = set()


# ── Валидация цели ────────────────────────────────────────────────────────────
_SHELL_META = re.compile(r"""[\s;|&$`<>(){}\[\]'"\\]""")
_HOST_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_URL_RE = re.compile(r"^https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$")


def default_wordlist() -> str:
    for path in _SYSTEM_WORDLISTS:
        if os.path.exists(path):
            return path
    return _BUNDLED_WORDLIST


def normalize_target(raw: str, kind: str) -> str:
    """Приводит цель к каноничному виду и проверяет её. Бросает ValueError."""
    target = (raw or "").strip()
    if not target:
        raise ValueError("Пустая цель")
    if "\n" in target or "\r" in target:
        raise ValueError("Недопустимый символ в цели")

    if kind == "url":
        if not target.startswith(("http://", "https://")):
            target = "http://" + target
        if _SHELL_META.search(target.replace("://", "", 1).split("?", 1)[0]) and " " in target:
            raise ValueError("Недопустимый URL")
        if not _URL_RE.match(target):
            raise ValueError("Некорректный URL цели")
        return target

    # kind == "host" — только имя хоста/IP, без схемы, пути и порта
    if target.startswith(("http://", "https://")):
        target = target.split("://", 1)[1]
    target = target.split("/", 1)[0].split(":", 1)[0]
    if _SHELL_META.search(target) or not _HOST_RE.match(target):
        raise ValueError("Некорректный хост цели")
    return target


def host_of(target: str) -> str:
    t = target
    if t.startswith(("http://", "https://")):
        t = t.split("://", 1)[1]
    return t.split("/", 1)[0].split(":", 1)[0]


# ── Парсеры вывода ───────────────────────────────────────────────────────────
Finding = Dict[str, str]  # {title, detail, severity}

_SEV_ORDER = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def _mk(title: str, detail: str = "", severity: str = "info") -> Finding:
    return {"title": title, "detail": detail[:500], "severity": severity}


def parse_whatweb(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    line = (out or "").strip().splitlines()[0] if out.strip() else ""
    # WhatWeb: "http://x [200 OK] Apache[2.4.7], Country[...], HTTPServer[...], HTML5, ..."
    line = re.sub(r"^\S+\s+\[[^\]]*\]\s*", "", line)  # убрать "http://x [200 OK] "
    for m in re.finditer(r"([A-Za-z][A-Za-z0-9 _-]*?)\[([^\[\]]*(?:\]\[[^\[\]]*)*)\]", line):
        findings.append(_mk(m.group(1).strip(), m.group(2).replace("][", ", ").strip(), "info"))
    seen = {f["title"] for f in findings}
    for token in re.findall(r"(?:^|,\s*)([A-Za-z][A-Za-z0-9_-]{1,})(?=,|$)", line):
        if token not in seen:
            findings.append(_mk(token, "", "info"))
    return findings


def parse_wafw00f(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    text = out + "\n" + err
    for m in re.finditer(r"is behind (.+?)(?: WAF| \(|\n|$)", text):
        findings.append(_mk("WAF обнаружен", m.group(1).strip(), "info"))
    if "No WAF detected" in text or "seems to be behind a WAF or IPS" not in text and "is behind" not in text:
        if "No WAF detected" in text:
            findings.append(_mk("WAF не обнаружен", "", "info"))
    return findings


_SEC_HEADERS = {
    "content-security-policy": ("Отсутствует Content-Security-Policy", "medium"),
    "strict-transport-security": ("Отсутствует HSTS (Strict-Transport-Security)", "medium"),
    "x-frame-options": ("Отсутствует X-Frame-Options", "low"),
    "x-content-type-options": ("Отсутствует X-Content-Type-Options", "low"),
    "referrer-policy": ("Отсутствует Referrer-Policy", "info"),
    "permissions-policy": ("Отсутствует Permissions-Policy", "info"),
}


def parse_http_headers(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    present = set()
    for line in (out or "").splitlines():
        line = line.strip()
        if not line or line.startswith("HTTP/"):
            if line.startswith("HTTP/"):
                findings.append(_mk("Статус", line, "info"))
            continue
        m = re.match(r"^([A-Za-z0-9-]+):\s*(.*)$", line)
        if not m:
            continue
        name, value = m.group(1).lower(), m.group(2)
        present.add(name)
        if name in ("server", "x-powered-by"):
            findings.append(_mk(m.group(1), value, "low" if name == "x-powered-by" else "info"))
    for hdr, (title, sev) in _SEC_HEADERS.items():
        if hdr not in present:
            findings.append(_mk(title, "", sev))
    return findings


def parse_nikto(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    for line in (out or "").splitlines():
        line = line.strip()
        if line.startswith("+ ") and not line.startswith("+ Target") and not line.startswith("+ Start Time"):
            body = line[2:]
            sev = "info"
            low = body.lower()
            if "osvdb" in low or "cve" in low or "vulnerab" in low or "outdated" in low:
                sev = "medium"
            if "x-frame-options" in low or "x-content-type-options" in low or "cookie" in low:
                sev = "low"
            findings.append(_mk("Nikto", body, sev))
    return findings


def parse_nuclei(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    # [template-id] [protocol] [severity] url [extra]
    for line in (out or "").splitlines():
        line = line.strip()
        m = re.match(r"^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(\S+)(.*)$", line)
        if not m:
            continue
        tid, _proto, sev, url, extra = m.groups()
        sev = sev.lower()
        if sev not in _SEV_ORDER:
            sev = "info"
        findings.append(_mk(tid, (url + " " + extra).strip(), sev))
    return findings


def parse_sslscan(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    text = out or ""
    for proto in ("SSLv2", "SSLv3", "TLSv1.0", "TLSv1.1"):
        if re.search(rf"{re.escape(proto)}\s+enabled", text):
            sev = "high" if proto in ("SSLv2", "SSLv3") else "medium"
            findings.append(_mk(f"Устаревший протокол {proto} включён", "", sev))
    if re.search(r"(RC4|DES|NULL|EXPORT|MD5)", text) and "Accepted" in text:
        for m in re.finditer(r"Accepted\s+(\S+)\s+\d+\s+bits\s+(\S*(?:RC4|DES|NULL|EXPORT|MD5)\S*)", text):
            findings.append(_mk("Слабый шифр принят", f"{m.group(1)} {m.group(2)}", "medium"))
    if "Heartbleed" in text:
        for m in re.finditer(r"(\S+) (vulnerable|not vulnerable) to heartbleed", text, re.I):
            if m.group(2).lower() == "vulnerable":
                findings.append(_mk("Heartbleed", m.group(1), "critical"))
    for m in re.finditer(r"(Subject|Issuer|Not valid (?:before|after)):\s*(.+)", text):
        findings.append(_mk(m.group(1), m.group(2).strip(), "info"))
    if not findings:
        findings.append(_mk("Слабых протоколов/шифров не обнаружено", "", "info"))
    return findings


def parse_testssl(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    for line in (out or "").splitlines():
        clean = re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
        if not clean:
            continue
        low = clean.lower()
        if "vulnerable" in low and "not vulnerable" not in low:
            findings.append(_mk("testssl: уязвимость", clean, "high"))
        elif re.search(r"\(NOT ok\)", clean) or "not ok" in low:
            findings.append(_mk("testssl: проблема", clean, "medium"))
    if not findings:
        findings.append(_mk("Критичных проблем TLS не обнаружено", "", "info"))
    return findings


def parse_gobuster(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    for line in (out or "").splitlines():
        clean = re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
        m = re.search(r"^(/\S+)\s+\(Status:\s*(\d{3})\)(?:\s*\[Size:\s*(\d+)\])?", clean)
        if m:
            code = m.group(2)
            sev = "info"
            if code.startswith("2"):
                sev = "low"
            elif code in ("401", "403"):
                sev = "info"
            findings.append(_mk(m.group(1), f"HTTP {code}" + (f", {m.group(3)} байт" if m.group(3) else ""), sev))
    return findings


def parse_ffuf(out: str, err: str) -> List[Finding]:
    findings: List[Finding] = []
    for line in (out or "").splitlines():
        clean = re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
        # silent-режим ffuf печатает только найденный путь/слово
        m = re.match(r"^([A-Za-z0-9._/~-]+)$", clean)
        if m and clean not in ("", ":: Progress ::"):
            findings.append(_mk("/" + clean.lstrip("/"), "найдено ffuf", "low"))
        m2 = re.search(r"^(\S+)\s+\[Status:\s*(\d{3}),", clean)
        if m2:
            findings.append(_mk("/" + m2.group(1).lstrip("/"), f"HTTP {m2.group(2)}", "low"))
    return findings


# ── Реестр инструментов ──────────────────────────────────────────────────────
class Tool:
    def __init__(
        self,
        id: str,
        name: str,
        category: str,
        binary: str,
        description: str,
        target_kind: str,
        build_args: Callable[[str, dict], List[str]],
        parse: Callable[[str, str], List[Finding]],
        timeout: int = 180,
        install_hint: str = "",
    ):
        self.id = id
        self.name = name
        self.category = category
        self.binary = binary
        self.description = description
        self.target_kind = target_kind
        self.build_args = build_args
        self.parse = parse
        self.timeout = timeout
        self.install_hint = install_hint

    @property
    def available(self) -> bool:
        return shutil.which(self.binary) is not None


CATEGORIES = {
    "recon": "Веб-разведка",
    "dirs": "Директории и файлы",
    "web_vuln": "Уязвимости веб",
    "tls": "TLS / SSL",
}


TOOLS: Dict[str, Tool] = {}


def _reg(tool: Tool):
    TOOLS[tool.id] = tool


_reg(Tool(
    id="whatweb", name="WhatWeb", category="recon", binary="whatweb",
    description="Определение технологий сайта: CMS, веб-сервер, фреймворки, JS-библиотеки.",
    target_kind="url", timeout=120, install_hint="apt install whatweb",
    build_args=lambda t, o: ["whatweb", "--color=never", "-a", str(int(o.get("aggression", 1) or 1)), t],
    parse=parse_whatweb,
))
_reg(Tool(
    id="wafw00f", name="wafw00f", category="recon", binary="wafw00f",
    description="Определение межсетевого экрана веб-приложений (WAF) перед целью.",
    target_kind="url", timeout=90, install_hint="pipx install wafw00f",
    build_args=lambda t, o: ["wafw00f", "-a", t],
    parse=parse_wafw00f,
))
_reg(Tool(
    id="http_headers", name="HTTP-заголовки", category="recon", binary="curl",
    description="Запрос заголовков ответа и проверка наличия заголовков безопасности.",
    target_kind="url", timeout=30, install_hint="apt install curl",
    build_args=lambda t, o: ["curl", "-sSI", "-L", "--max-time", "20", "-A", "nmap-panel-audit", t],
    parse=parse_http_headers,
))

_reg(Tool(
    id="gobuster", name="Gobuster (dir)", category="dirs", binary="gobuster",
    description="Брутфорс путей и файлов по словарю (режим dir).",
    target_kind="url", timeout=600, install_hint="apt install gobuster",
    build_args=lambda t, o: [
        "gobuster", "dir", "-u", t, "-q", "--no-color",
        "-w", o.get("wordlist") or default_wordlist(),
        "-t", str(int(o.get("threads", 20) or 20)),
    ] + (["-x", o["extensions"]] if o.get("extensions") and re.match(r"^[A-Za-z0-9,]+$", o["extensions"]) else []),
    parse=parse_gobuster,
))
_reg(Tool(
    id="ffuf", name="ffuf", category="dirs", binary="ffuf",
    description="Быстрый веб-фаззер путей (FUZZ в конце URL).",
    target_kind="url", timeout=600, install_hint="apt install ffuf",
    build_args=lambda t, o: [
        "ffuf", "-s", "-u", t.rstrip("/") + "/FUZZ",
        "-w", (o.get("wordlist") or default_wordlist()) + ":FUZZ",
        "-t", str(int(o.get("threads", 40) or 40)),
        "-mc", o.get("match_codes") or "200,204,301,302,307,401,403",
    ],
    parse=parse_ffuf,
))

_reg(Tool(
    id="nikto", name="Nikto", category="web_vuln", binary="nikto",
    description="Сканер веб-сервера: опасные файлы, устаревшее ПО, ошибки конфигурации.",
    target_kind="url", timeout=900, install_hint="apt install nikto",
    build_args=lambda t, o: ["nikto", "-h", t, "-nointeractive", "-ask", "no", "-maxtime", str(int(o.get("maxtime", 600) or 600))],
    parse=parse_nikto,
))
_reg(Tool(
    id="nuclei", name="Nuclei", category="web_vuln", binary="nuclei",
    description="Шаблонный сканер уязвимостей и типовых мисконфигураций.",
    target_kind="url", timeout=900, install_hint="go install .../nuclei@latest",
    build_args=lambda t, o: [
        "nuclei", "-u", t, "-nc", "-silent",
        "-severity", o.get("severity") or "low,medium,high,critical",
    ] + (["-rl", str(int(o["rate_limit"]))] if str(o.get("rate_limit", "")).isdigit() else []),
    parse=parse_nuclei,
))

_reg(Tool(
    id="sslscan", name="sslscan", category="tls", binary="sslscan",
    description="Поддерживаемые протоколы и шифры TLS, слабые наборы, срок сертификата.",
    target_kind="host", timeout=120, install_hint="apt install sslscan",
    build_args=lambda t, o: ["sslscan", "--no-colour", f"{t}:{int(o.get('port', 443) or 443)}"],
    parse=parse_sslscan,
))
_reg(Tool(
    id="testssl", name="testssl.sh", category="tls", binary="testssl",
    description="Глубокая проверка TLS: известные уязвимости (Heartbleed, ROBOT, ...), рейтинг.",
    target_kind="host", timeout=900, install_hint="apt install testssl.sh",
    build_args=lambda t, o: ["testssl", "--color", "0", "--quiet", f"{t}:{int(o.get('port', 443) or 443)}"],
    parse=parse_testssl,
))


def list_tools() -> List[dict]:
    result = []
    for tool in TOOLS.values():
        result.append({
            "id": tool.id,
            "name": tool.name,
            "category": tool.category,
            "category_label": CATEGORIES.get(tool.category, tool.category),
            "description": tool.description,
            "binary": tool.binary,
            "target_kind": tool.target_kind,
            "available": tool.available,
            "install_hint": tool.install_hint,
            "timeout": tool.timeout,
        })
    return result


# ── Раннер ───────────────────────────────────────────────────────────────────
def _summarize(findings: List[Finding]) -> str:
    if not findings:
        return "Результатов нет"
    by_sev: Dict[str, int] = {}
    for f in findings:
        by_sev[f["severity"]] = by_sev.get(f["severity"], 0) + 1
    parts = [f"{by_sev[s]} {s}" for s in ("critical", "high", "medium", "low", "info") if s in by_sev]
    return f"{len(findings)} findings: " + ", ".join(parts)


def run_audit_task(task_id: str, tool_id: str, target_raw: str, scan_id: Optional[str], options: Optional[dict]):
    """Запускает инструмент в подпроцессе, стримит вывод, парсит и сохраняет в БД."""
    options = options or {}
    tool = TOOLS.get(tool_id)
    start_time = datetime.now().isoformat()

    status = AuditTaskStatus(
        task_id=task_id, tool_id=tool_id, target=target_raw, scan_id=scan_id,
        status="running", output="", findings=[], summary="Запуск...", command="",
    )
    audit_statuses[task_id] = status

    if tool is None:
        status.status = "error"
        status.summary = f"Неизвестный инструмент: {tool_id}"
        save_audit_task(task_id, scan_id, tool_id, target_raw, options, "error", start_time, "")
        update_audit_task(task_id, "error", datetime.now().isoformat(), "", "", status.summary)
        return

    try:
        target = normalize_target(target_raw, tool.target_kind)
        args = tool.build_args(target, options)
        if not isinstance(args, list) or not all(isinstance(a, str) for a in args):
            raise ValueError("Некорректная сборка команды")
    except ValueError as exc:
        status.status = "error"
        status.summary = f"Цель отклонена: {exc}"
        save_audit_task(task_id, scan_id, tool_id, target_raw, options, "error", start_time, "")
        update_audit_task(task_id, "error", datetime.now().isoformat(), "", "", status.summary)
        return

    command = " ".join(args)
    status.command = command
    status.target = target
    save_audit_task(task_id, scan_id, tool_id, target, options, "running", start_time, command)

    try:
        process = subprocess.Popen(
            args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, env={**os.environ, "NO_COLOR": "1"},
        )
    except FileNotFoundError:
        status.status = "error"
        status.summary = f"Инструмент не установлен: {tool.binary} ({tool.install_hint})"
        update_audit_task(task_id, "error", datetime.now().isoformat(), "", "", status.summary)
        return
    except Exception as exc:  # noqa: BLE001
        status.status = "error"
        status.summary = f"Не удалось запустить: {exc}"
        update_audit_task(task_id, "error", datetime.now().isoformat(), "", "", status.summary)
        return

    audit_processes[task_id] = process
    deadline = threading.Timer(tool.timeout, _kill, args=(task_id, "timeout"))
    deadline.daemon = True
    deadline.start()

    buf: List[str] = []
    truncated = False
    try:
        assert process.stdout is not None
        for line in process.stdout:
            if sum(len(x) for x in buf) < MAX_OUTPUT_CHARS:
                buf.append(line)
                status.output = "".join(buf)
            elif not truncated:
                truncated = True
                buf.append("\n... вывод обрезан ...\n")
                status.output = "".join(buf)
        process.wait()
    finally:
        deadline.cancel()
        audit_processes.pop(task_id, None)

    end_time = datetime.now().isoformat()
    full_output = "".join(buf)
    cancelled = task_id in _audit_cancelled
    _audit_cancelled.discard(task_id)

    if cancelled:
        status.status = "cancelled"
        status.summary = "Остановлено пользователем" if status.summary != "timeout" else "Прервано по таймауту"
        if status.summary == "timeout":
            status.summary = f"Прервано по таймауту ({tool.timeout} с)"
        update_audit_task(task_id, status.status, end_time, full_output, "[]", status.summary)
        return

    try:
        findings = tool.parse(full_output, "")
    except Exception as exc:  # noqa: BLE001
        findings = [_mk("Ошибка парсинга вывода", str(exc), "info")]

    findings.sort(key=lambda f: _SEV_ORDER.get(f["severity"], 0), reverse=True)
    summary = _summarize(findings)
    final_status = "done" if process.returncode in (0, 1) else "done"  # многие сканеры возвращают 1 при находках

    status.status = final_status
    status.findings = findings
    status.summary = summary
    status.output = full_output

    import json
    update_audit_task(task_id, final_status, end_time, full_output, json.dumps(findings, ensure_ascii=False), summary)


def _kill(task_id: str, reason: str):
    process = audit_processes.get(task_id)
    if not process:
        return
    _audit_cancelled.add(task_id)
    if task_id in audit_statuses:
        audit_statuses[task_id].summary = reason
    try:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    except Exception:  # noqa: BLE001
        pass


def cancel_audit_task(task_id: str) -> bool:
    if task_id not in audit_processes:
        return False
    _kill(task_id, "cancelled")
    return True


def get_audit_status(task_id: str) -> Optional[AuditTaskStatus]:
    return audit_statuses.get(task_id)
