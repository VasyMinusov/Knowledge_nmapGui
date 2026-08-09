# backend/app/routes/port_check.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
from typing import List, Optional

router = APIRouter(tags=["port-check"])

class PortCheckRequest(BaseModel):
    host: str
    ports: List[int]
    timeout: float = 2.0

class PortCheckResult(BaseModel):
    port: int
    state: str  # 'open', 'closed', 'error'
    error: Optional[str] = None

async def check_port(host: str, port: int, timeout: float) -> PortCheckResult:
    """Проверяет один порт с помощью асинхронного TCP-соединения."""
    try:
        loop = asyncio.get_running_loop()
        # Используем asyncio.open_connection с таймаутом
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=timeout
            )
            writer.close()
            await writer.wait_closed()
            return PortCheckResult(port=port, state="open")
        except asyncio.TimeoutError:
            return PortCheckResult(port=port, state="closed")
        except ConnectionRefusedError:
            return PortCheckResult(port=port, state="closed")
        except Exception as e:
            return PortCheckResult(port=port, state="error", error=str(e))
    except Exception as e:
        return PortCheckResult(port=port, state="error", error=str(e))

@router.post("/check")
async def check_ports(request: PortCheckRequest):
    """Проверяет список портов на указанном хосте."""
    if not request.host:
        raise HTTPException(status_code=400, detail="Host is required")
    if not request.ports:
        raise HTTPException(status_code=400, detail="At least one port is required")

    tasks = [check_port(request.host, port, request.timeout) for port in request.ports]
    results = await asyncio.gather(*tasks)
    
    return {
        "host": request.host,
        "results": [result.dict() for result in results],
        "summary": {
            "total": len(results),
            "open": sum(1 for r in results if r.state == "open"),
            "closed": sum(1 for r in results if r.state == "closed"),
            "error": sum(1 for r in results if r.state == "error"),
        }
    }