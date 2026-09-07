# backend/app/terminal.py
"""
Встроенный терминал: разовое выполнение инструментов пентеста/анализа БЕЗ записи
в БД. Сессии живут только в памяти и вычищаются по завершении/таймауту.

Безопасность: команда разбирается через shlex (без shell=True), первый токен
обязан входить в ALLOWED_BINARIES, конвейеры/подстановки оболочки не выполняются
(передаются инструменту как обычные аргументы). Процесс стартует в песочнице
terminal_runs/ с ограничением объёма вывода и таймаутом.
"""
import os
import shlex
import shutil
import signal
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

RUN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "terminal_runs")
RUN_DIR = os.path.abspath(RUN_DIR)
os.makedirs(RUN_DIR, exist_ok=True)

MAX_OUTPUT_CHARS = 1_000_000
DEFAULT_TIMEOUT = 900          # с
SESSION_TTL = 20 * 60          # с — сколько держим завершённую сессию в памяти

# Разрешённые бинарники (разведка / пентест / анализ). Всё остальное отклоняется.
ALLOWED_BINARIES = {
    # ── сетевое сканирование портов ──
    "nmap", "masscan", "rustscan", "naabu", "unicornscan", "zmap",
    # ── веб-уязвимости ──
    "sqlmap", "nikto", "nuclei", "wpscan", "joomscan", "droopescan",
    "dalfox", "xsstrike", "commix", "arjun", "whatweb", "wafw00f",
    "nuclei-templates", "wpscan-update", "cmseek", "gobuster-vhost",
    # ── перебор путей / контента ──
    "gobuster", "ffuf", "feroxbuster", "dirb", "dirsearch", "wfuzz",
    "dirbuster", "gospider", "hakrawler", "katana", "photon",
    # ── поддомены / OSINT ──
    "subfinder", "amass", "assetfinder", "sublist3r", "findomain",
    "theharvester", "theHarvester", "waybackurls", "gau", "gauplus",
    "github-subdomains", "shosubgo", "crtsh", "dnsgen",
    # ── DNS ──
    "dig", "host", "nslookup", "dnsx", "dnsrecon", "dnsenum", "fierce",
    "dnswalk", "whois", "dnstwist",
    # ── TLS / SSL ──
    "sslscan", "sslyze", "testssl", "tlsx", "openssl", "cipherscan",
    # ── HTTP-клиенты / анализ ──
    "curl", "wget", "httpx", "httprobe", "http", "meg", "gowitness",
    "eyewitness", "wappalyzer", "webanalyze",
    # ── SMB / AD / сетевые сервисы ──
    "enum4linux", "enum4linux-ng", "smbclient", "smbmap", "rpcclient",
    "nbtscan", "crackmapexec", "nxc", "ldapsearch", "ldapdomaindump",
    "onesixtyone", "snmpwalk", "snmp-check", "snmpbulkwalk", "showmount",
    "rusers", "finger", "ident-user-enum",
    # ── брутфорс / пароли ──
    "hydra", "medusa", "patator", "ncrack", "crowbar",
    "john", "hashcat", "hash-identifier", "hashid", "cewl",
    # ── эксплойты / полезные нагрузки ──
    "searchsploit", "msfvenom",
    # ── сетевые утилиты ──
    "ping", "ping6", "traceroute", "tracepath", "mtr", "arping",
    "nc", "ncat", "socat", "hping3", "tcptraceroute", "fping",
    "ip", "arp", "route", "ss", "netstat",
    # ── прочее ──
    "nikto.pl", "echo", "base64", "xxd", "strings", "file", "jq",
}

# Токены-операторы оболочки: не выполняются, только предупреждаем пользователя.
_SHELL_OPS = {"|", "||", "&&", ";", ">", ">>", "<", "&", "$(", "`"}


@dataclass
class TerminalSession:
    id: str
    command: str
    argv: List[str]
    proc: Optional[subprocess.Popen] = None
    buffer: str = ""
    running: bool = True
    exit_code: Optional[int] = None
    note: str = ""
    created_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    _lock: threading.Lock = field(default_factory=threading.Lock)


_sessions: Dict[str, TerminalSession] = {}


def catalog_binaries() -> Dict[str, bool]:
    """Карта {бинарник: доступен ли в системе}."""
    seen = {}
    for name in sorted(ALLOWED_BINARIES):
        key = name.lower()
        if key in seen:
            continue
        seen[key] = shutil.which(name) is not None
    return seen


def _sweep():
    now = time.time()
    for sid in list(_sessions):
        s = _sessions.get(sid)
        if not s:
            continue
        if not s.running and s.finished_at and now - s.finished_at > SESSION_TTL:
            _sessions.pop(sid, None)


def validate_command(command: str) -> Tuple[Optional[List[str]], Optional[str], List[str]]:
    """Возвращает (argv, error, warnings)."""
    command = (command or "").strip()
    if not command:
        return None, "Пустая команда", []
    if "\x00" in command:
        return None, "Недопустимый символ", []
    try:
        argv = shlex.split(command)
    except ValueError as exc:
        return None, f"Не разобрать команду: {exc}", []
    if not argv:
        return None, "Пустая команда", []

    warnings: List[str] = []
    if any(tok in _SHELL_OPS for tok in argv) or any(c in command for c in ("|", ">", "<", "`")) or "$(" in command:
        warnings.append("Конвейеры и перенаправления оболочки не выполняются — команда запускается напрямую.")

    binary = os.path.basename(argv[0]).lower()
    if binary not in {b.lower() for b in ALLOWED_BINARIES}:
        allowed = ", ".join(sorted({b.lower() for b in ALLOWED_BINARIES}))
        return None, f"Инструмент '{argv[0]}' не в списке разрешённых.\nДоступно: {allowed}", warnings
    if shutil.which(argv[0]) is None:
        return None, f"Инструмент '{argv[0]}' разрешён, но не установлен в системе.", warnings

    return argv, None, warnings


def start_command(command: str) -> Tuple[Optional[str], Optional[str], List[str]]:
    _sweep()
    argv, error, warnings = validate_command(command)
    if error:
        return None, error, warnings

    session_id = str(uuid.uuid4())
    sess = TerminalSession(id=session_id, command=command.strip(), argv=argv or [])
    header = f"$ {command.strip()}\n"
    if warnings:
        header += "".join(f"[!] {w}\n" for w in warnings)
    sess.buffer = header
    _sessions[session_id] = sess

    def _run():
        try:
            proc = subprocess.Popen(
                argv, cwd=RUN_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1, env={**os.environ, "NO_COLOR": "1", "TERM": "dumb"},
                start_new_session=True,
            )
        except FileNotFoundError:
            with sess._lock:
                sess.buffer += f"\n[x] Не найден бинарник: {argv[0]}\n"
                sess.running = False
                sess.exit_code = 127
                sess.finished_at = time.time()
            return
        except Exception as exc:  # noqa: BLE001
            with sess._lock:
                sess.buffer += f"\n[x] Не удалось запустить: {exc}\n"
                sess.running = False
                sess.exit_code = 1
                sess.finished_at = time.time()
            return

        sess.proc = proc
        timer = threading.Timer(DEFAULT_TIMEOUT, _kill, args=(session_id, "timeout"))
        timer.daemon = True
        timer.start()
        truncated = False
        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                with sess._lock:
                    if len(sess.buffer) < MAX_OUTPUT_CHARS:
                        sess.buffer += line
                    elif not truncated:
                        truncated = True
                        sess.buffer += "\n... вывод обрезан ...\n"
            proc.wait()
        finally:
            timer.cancel()
            with sess._lock:
                sess.running = False
                sess.exit_code = proc.returncode
                sess.finished_at = time.time()
                tail = sess.note or ""
                sess.buffer += f"\n[{'прервано: ' + tail if tail else 'завершено'}] код выхода {proc.returncode}\n"

    threading.Thread(target=_run, daemon=True).start()
    return session_id, None, warnings


_SIG_MAP = {"int": signal.SIGINT, "kill": signal.SIGKILL, "timeout": signal.SIGTERM}


def _kill(session_id: str, note: str):
    sess = _sessions.get(session_id)
    if not sess or not sess.proc:
        return
    sess.note = {"timeout": f"таймаут {DEFAULT_TIMEOUT} с", "int": "SIGINT", "kill": "SIGKILL"}.get(note, note)
    sig = _SIG_MAP.get(note, signal.SIGTERM)
    try:
        os.killpg(os.getpgid(sess.proc.pid), sig)
    except (ProcessLookupError, PermissionError):
        try:
            sess.proc.kill()
        except Exception:  # noqa: BLE001
            pass


def send_signal(session_id: str, sig: str) -> bool:
    sess = _sessions.get(session_id)
    if not sess or not sess.running:
        return False
    _kill(session_id, "int" if sig == "int" else "kill")
    return True


def read_session(session_id: str, cursor: int = 0) -> Optional[dict]:
    sess = _sessions.get(session_id)
    if not sess:
        return None
    with sess._lock:
        buf = sess.buffer
        chunk = buf[cursor:] if 0 <= cursor <= len(buf) else buf
        return {
            "session_id": session_id,
            "command": sess.command,
            "chunk": chunk,
            "cursor": len(buf),
            "running": sess.running,
            "exit_code": sess.exit_code,
        }


def close_session(session_id: str) -> bool:
    sess = _sessions.get(session_id)
    if not sess:
        return False
    if sess.running:
        _kill(session_id, "kill")
    _sessions.pop(session_id, None)
    return True
