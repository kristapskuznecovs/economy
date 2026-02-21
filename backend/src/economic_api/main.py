"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.inbound.api.routers import simulation

# Create FastAPI app
app = FastAPI(
    title="Economic Simulation API",
    description="Latvia DSGE/CGE Political Tool - Economic Counterfactual Analysis",
    version="0.1.0-mvp",
)

# CORS configuration - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Vite dev server
        "http://localhost:3000",  # Alternative frontend port
        "http://localhost:5173",  # Another common Vite port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulation.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Economic Simulation API",
        "version": "0.1.0-mvp",
        "docs": "/docs",
    }
