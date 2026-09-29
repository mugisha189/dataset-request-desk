from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .logging_middleware import AccessLogMiddleware
from .routers import analytics, auth, episodes, health, requests, users

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Dataset Request Desk")

app.add_middleware(AccessLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(episodes.router)
app.include_router(requests.router)
app.include_router(analytics.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    # Let any non-API path resolve to the single-page app so a browser refresh
    # on e.g. /requests/123 still works; real 404s for unknown API routes are
    # handled by the routers above since they're registered first.
    if full_path.startswith("api/") or full_path.startswith("static/"):
        return FileResponse(STATIC_DIR / "index.html", status_code=404)
    return FileResponse(STATIC_DIR / "index.html")
