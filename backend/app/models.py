from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ScanOptions(BaseModel):
    os_detection: bool = False
    version_detection: bool = False
    traceroute: bool = False
    scripts: Optional[str] = None  # например, "default" или "safe"
    timing: Optional[int] = None   # 0-5

class ScanRequest(BaseModel):
    targets: str
    profile: str  # 'intense', 'quick', 'ping', 'custom'
    options: Optional[ScanOptions] = None

class PortInfo(BaseModel):
    port: int
    protocol: str
    state: str
    service: Optional[str] = None
    version: Optional[str] = None

class HostInfo(BaseModel):
    ip: str
    hostname: Optional[str] = None
    status: str  # 'up' или 'down'
    ports: List[PortInfo] = []
    os: Optional[str] = None
    uptime: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None  # для скриптов и пр.

class ScanStatus(BaseModel):
    scan_id: str
    status: str  # 'pending', 'running', 'done', 'error'
    progress: Optional[int] = None  # 0-100
    hosts: List[HostInfo] = []
    summary: Optional[str] = None