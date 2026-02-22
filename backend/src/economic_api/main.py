"""FastAPI application entry point."""

import logging
import os
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .adapters.inbound.api.routers import budget, policy, simulation

logger = logging.getLogger(__name__)

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

REQUEST_ID_HEADER = "X-Request-ID"
_ERROR_CODE_BY_STATUS = {
    400: "bad_request",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    503: "upstream_unavailable",
}


def _error_code_for_status(status_code: int) -> str:
    code = _ERROR_CODE_BY_STATUS.get(status_code)
    if code:
        return code
    if status_code >= 500:
        return "internal_error"
    return "api_error"


def _new_request_id() -> str:
    return str(uuid4())


def _request_id_from_header(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER, "").strip()
    return incoming or _new_request_id()


def _request_id_from_request(request: Request) -> str:
    from_state = getattr(request.state, "request_id", None)
    if isinstance(from_state, str) and from_state.strip():
        return from_state
    return _request_id_from_header(request)


def _extract_error_message(details: Any) -> str:
    if isinstance(details, str):
        return details
    if isinstance(details, dict):
        detail_message = details.get("message")
        return str(detail_message) if detail_message else "Request failed."
    return "Request failed."


def _error_payload(*, status_code: int, message: str, request_id: str, details: Any = None) -> dict[str, Any]:
    return {
        "error": {
            "code": _error_code_for_status(status_code),
            "message": message,
            "details": details,
            "request_id": request_id,
        },
        # Keep detail for backward compatibility with existing clients.
        "detail": details if details is not None else message,
    }


def _log_request(request: Request, *, request_id: str, status_code: int, started_at: float) -> None:
    latency_ms = (perf_counter() - started_at) * 1000
    client_ip = request.client.host if request.client else "unknown"
    logger.info(
        "api_request request_id=%s method=%s path=%s status_code=%s latency_ms=%.2f client_ip=%s",
        request_id,
        request.method,
        request.url.path,
        status_code,
        latency_ms,
        client_ip,
    )


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = _request_id_from_header(request)
    request.state.request_id = request_id
    started_at = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        _log_request(request, request_id=request_id, status_code=500, started_at=started_at)
        raise

    _log_request(request, request_id=request_id, status_code=response.status_code, started_at=started_at)
    response.headers[REQUEST_ID_HEADER] = request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = _request_id_from_request(request)
    details = exc.detail
    message = _extract_error_message(details)
    payload = _error_payload(
        status_code=exc.status_code,
        message=message,
        request_id=request_id,
        details=details,
    )
    headers = dict(exc.headers or {})
    headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(status_code=exc.status_code, content=payload, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = _request_id_from_request(request)
    payload = _error_payload(
        status_code=422,
        message="Request validation failed.",
        request_id=request_id,
        details=exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content=payload,
        headers={REQUEST_ID_HEADER: request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id_from_request(request)
    logger.exception("Unhandled API exception request_id=%s path=%s", request_id, request.url.path)
    payload = _error_payload(
        status_code=500,
        message="Internal Server Error",
        request_id=request_id,
        details=None,
    )
    return JSONResponse(
        status_code=500,
        content=payload,
        headers={REQUEST_ID_HEADER: request_id},
    )


# Include routers
app.include_router(simulation.router)
app.include_router(policy.router)
app.include_router(budget.router)


@app.get("/", summary="API Info", description="Return API metadata and docs URL.")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Economic Simulation API",
        "version": "0.1.0-mvp",
        "docs": "/docs",
    }
