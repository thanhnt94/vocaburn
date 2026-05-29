from fastapi import FastAPI, Request, Depends, Form, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.auth.services.central_auth_client import CentralAuthClient
from app.core.db import get_db, engine, Base
from app.core.init_db import init_db
from app.modules.stats.services.analytics_service import AnalyticsService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.auth.services.auth_service import AuthService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from contextlib import asynccontextmanager
import os
import httpx
import time
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    yield

app = FastAPI(
    title="Vocaburn API",
    description="A standalone high-scale Vocaburn system (100% Pure Headless React SPA)",
    version="2.0.0",
    lifespan=lifespan
)

# Static & Templates
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ensure audio storage folder exists
os.makedirs(settings.VOCABURN_STORAGE_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.VOCABURN_STORAGE_DIR), name="vocaburn_storage")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
# Mount Vite dist specifically if it exists
DIST_DIR = os.path.join(BASE_DIR, "static", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/static/dist", StaticFiles(directory=DIST_DIR), name="dist")


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5090",
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5090",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.modules.quiz.routes.api import router as quiz_api_router
from app.modules.quiz.routes.room import router as room_router
from app.modules.sso_module.routes import router as sso_api_router
from app.modules.admin import router as admin_router
from app.modules.auth import router as auth_router
from app.modules.stats import router as stats_router
from app.modules.notification import router as notification_router

app.include_router(quiz_api_router, prefix=settings.API_V1_STR)
app.include_router(room_router, prefix=settings.API_V1_STR)
app.include_router(sso_api_router)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix="/api")
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(auth_router)
app.include_router(stats_router, prefix=settings.API_V1_STR)
app.include_router(notification_router, prefix=settings.API_V1_STR)

# --- Health Checks for Ecosystem ---
@app.get("/api/health")
@app.get("/auth-center/callback/health")
async def health_check():
    return {"status": "ok", "service": "Vocaburn", "timestamp": time.time()}





@app.get("/")
@app.get("/login")
@app.get("/dashboard")
@app.get("/quiz/{path:path}")
@app.get("/flashcard/{path:path}")
@app.get("/practice/{path:path}")
@app.get("/profile")
@app.get("/stats")
@app.get("/settings")
@app.get("/manage")
@app.get("/manage/{path:path}")
@app.get("/room/{path:path}")
@app.get("/admin")
@app.get("/admin/{path:path}")
@app.get("/auth/callback")
async def serve_spa(request: Request, db: AsyncSession = Depends(get_db)):
    # Serve React SPA index.html unconditionally for all frontend paths
    spa_index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(spa_index):
        from fastapi.responses import FileResponse
        response = FileResponse(spa_index)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    return JSONResponse(
        status_code=404, 
        content={"status": "error", "message": "SPA assets not found. Please compile the Vite frontend client first."}
    )








@app.get("/discover")
async def discover_page(request: Request, db: AsyncSession = Depends(get_db)):
    # Redirect to home with a special flag to open the discover tab
    return RedirectResponse(url="/?tab=discover")



