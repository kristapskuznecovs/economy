"""Policy parsing API router."""

import logging
import os
import threading
from collections import defaultdict, deque
from time import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from .....adapters.outbound.external import PolicyParser
from .....application.dto import (
    ErrorResponseDTO,
    PolicyInterpretationDTO,
    PolicyParseRequestDTO,
    PolicyParseResponseDTO,
)
from ..dependencies import get_policy_parser

router = APIRouter(prefix="/api", tags=["policy"])
logger = logging.getLogger(__name__)


def _env_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("Invalid integer env %s=%r, using default=%s", name, raw, default)
        return default
    return max(minimum, min(value, maximum))


class InMemoryRateLimiter:
    """Simple per-key fixed-window limiter for MVP."""

    def __init__(self, limit: int, window_seconds: int, max_keys: int = 10000) -> None:
        self.limit = max(1, limit)
        self.window_seconds = max(1, window_seconds)
        self.max_keys = max(100, max_keys)
        self._events: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._calls = 0

    def allow(self, key: str) -> tuple[bool, int]:
        now = time()
        with self._lock:
            self._calls += 1
            if self._calls % 200 == 0:
                self._prune(now)
            bucket = self._events[key]
            while bucket and (now - bucket[0]) >= self.window_seconds:
                bucket.popleft()
            if len(bucket) >= self.limit:
                retry_after = int(self.window_seconds - (now - bucket[0]))
                return False, max(1, retry_after)
            bucket.append(now)
            return True, 0

    def _prune(self, now: float) -> None:
        stale_keys = [
            key
            for key, bucket in self._events.items()
            if (not bucket) or ((now - bucket[-1]) >= self.window_seconds)
        ]
        for key in stale_keys:
            self._events.pop(key, None)
        if len(self._events) <= self.max_keys:
            return
        # Keep most recent buckets when key cardinality spikes.
        by_latest = sorted(self._events.items(), key=lambda item: item[1][-1], reverse=True)
        self._events = defaultdict(deque, by_latest[: self.max_keys])


_parse_limit_per_minute = _env_int("POLICY_PARSE_RATE_LIMIT_PER_MINUTE", 30, minimum=1, maximum=300)
_parse_limit_max_keys = _env_int("POLICY_PARSE_RATE_LIMIT_MAX_KEYS", 10000, minimum=100, maximum=100000)
_trust_proxy_headers = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in {"1", "true", "yes", "on"}
_limiter = InMemoryRateLimiter(
    limit=_parse_limit_per_minute,
    window_seconds=60,
    max_keys=_parse_limit_max_keys,
)
POLICY_PARSE_RESPONSES = {
    400: {"model": ErrorResponseDTO, "description": "Invalid policy input."},
    429: {"model": ErrorResponseDTO, "description": "Policy parsing rate limit exceeded."},
    422: {"model": ErrorResponseDTO, "description": "Request validation failed."},
    503: {"model": ErrorResponseDTO, "description": "Policy parsing service unavailable."},
}


def _client_key(request: Request) -> str:
    if _trust_proxy_headers:
        xff = request.headers.get("x-forwarded-for", "")
        if xff:
            forwarded_ip = xff.split(",")[0].strip()
            if forwarded_ip:
                return forwarded_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _emergency_fallback_response(policy_text: str, parser_error: str) -> PolicyParseResponseDTO:
    """Return a safe parse response when parser fails unexpectedly."""
    excerpt = " ".join(policy_text.split())[:140]
    interpretation = PolicyInterpretationDTO(
        policy_type="regulation",
        category="general",
        parameter_changes={},
        confidence=0.35,
        reasoning=(
            "Emergency fallback interpretation was used because the parser encountered an unexpected "
            "internal failure."
        ),
        ambiguities=[
            "Parser failed unexpectedly; results use generic assumptions.",
            f"Policy excerpt: {excerpt}" if excerpt else "Policy excerpt unavailable.",
            f"Internal parser error: {parser_error}",
        ],
        clarification_needed=False,
        clarification_questions=[
            "Optional: specify sector, amount/percentage, and duration to improve interpretation quality."
        ],
    )
    return PolicyParseResponseDTO(
        interpretation=interpretation,
        decision="require_confirmation",
        can_simulate=True,
        warning="Parser fallback mode active. Simulation remains available with low-confidence assumptions.",
        parser_used="rule_based",
        parser_error=parser_error,
    )


@router.post(
    "/policy/parse",
    response_model=PolicyParseResponseDTO,
    summary="Parse Policy Text",
    description="Parse policy text into a structured interpretation for simulation and confidence gating.",
    responses=POLICY_PARSE_RESPONSES,
)
async def parse_policy(
    http_request: Request,
    payload: PolicyParseRequestDTO,
    parser: Annotated[PolicyParser, Depends(get_policy_parser)],
) -> PolicyParseResponseDTO:
    """Parse natural-language policy text into structured simulation input."""
    client_key = _client_key(http_request)
    allowed, retry_after = _limiter.allow(client_key)
    if not allowed:
        logger.warning("Policy parse rate-limit exceeded key=%s", client_key)
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded for policy parsing. Please retry shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        result = parser.parse(
            policy_text=payload.policy,
            country=payload.country,
            clarification_answers=payload.clarification_answers,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected policy parse failure for key=%s", client_key)
        return _emergency_fallback_response(
            policy_text=payload.policy,
            parser_error=f"{type(exc).__name__}: {exc}",
        )

    interpretation = PolicyInterpretationDTO(
        policy_type=result.interpretation.policy_type,
        category=result.interpretation.category,
        parameter_changes=result.interpretation.parameter_changes,
        confidence=result.interpretation.confidence,
        reasoning=result.interpretation.reasoning,
        ambiguities=result.interpretation.ambiguities,
        clarification_needed=result.interpretation.clarification_needed,
        clarification_questions=result.interpretation.clarification_questions,
    )

    return PolicyParseResponseDTO(
        interpretation=interpretation,
        decision=result.decision,
        can_simulate=result.can_simulate,
        warning=result.warning,
        parser_used=result.parser_used,
        parser_error=result.parser_error,
    )
