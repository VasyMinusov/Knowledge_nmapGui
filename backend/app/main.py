from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import scan, schedule, port_check
from .knowledge_base import router as knowledge_router

app = FastAPI(title="Nmap Panel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(knowledge_router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(port_check.router, prefix="/api/port-check", tags=["port-check"])

@app.get("/")
def root():
    return {"message": "Nmap Panel API"}