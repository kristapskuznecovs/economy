"""FastAPI application entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.inbound.api.routers import budget, policy, simulation

# Create FastAPI app
app = FastAPI(
    title="Economic Simulation API",
    description="Latvia DSGE/CGE Political Tool - Economic Counterfactual Analysis",
    version="0.1.0-mvp",
)

# CORS configuration - allow localhost frontend variants in development
_cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
_cors_origins = [origin.strip() for origin in _cors_origins_env.split(",") if origin.strip()]
if not _cors_origins:
    _cors_origins = [
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulation.router)
app.include_router(policy.router)
app.include_router(budget.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Economic Simulation API",
        "version": "0.1.0-mvp",
        "docs": "/docs",
    }
