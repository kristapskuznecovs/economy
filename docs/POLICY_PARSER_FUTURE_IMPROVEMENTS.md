# Policy Parser Future Improvements

This document lists **remaining production work** for the policy parsing flow (`POST /api/policy/parse`) and Ask Fiscal AI interpretation path.

## Priority 0 (Do Next)

1. Model allowlist and fallback model
- Validate `OPENAI_MODEL` against an explicit allowlist.
- Add `OPENAI_FALLBACK_MODEL` and retry once on primary-model failure classes.
- Log both primary and fallback model usage.

2. Per-user quotas (not only per-IP)
- Add authenticated user/API-key quotas (daily and monthly).
- Keep current IP limiter as a secondary abuse guard.
- Return clear quota errors with reset time.

3. Strong typed response validation for `parameter_changes`
- Replace free-form dict behavior with per-`policy_type` schema validation.
- Reject or sanitize invalid types/ranges before simulation.
- Add explicit validation errors in API response.

4. Centralized metrics and alerts
- Export latency, error rate, confidence, tokens, and estimated cost to metrics backend (Prometheus/OpenTelemetry).
- Add alerts for: sustained OpenAI failures, high fallback rate, and cost threshold breaches.

## Priority 1 (Short Term)

1. Distributed rate limiting and caching
- Move in-memory limiter/cache to Redis for multi-instance deployments.
- Use consistent TTL and shared counters across replicas.

2. Request deduplication (in-flight coalescing)
- If the same parse request is already running, attach callers to the same result.
- Prevent duplicate OpenAI calls during bursts.

3. Circuit breaker around OpenAI
- Open circuit after repeated failures in a short window.
- Use rule-based parser while open and auto-recover with half-open probes.

4. Prompt versioning and change control
- Add `PROMPT_VERSION` constant.
- Include prompt version in logs and parse response metadata.
- Keep migration notes when prompt contract changes.

5. Model/version pinning policy
- Define approved model versions and review cadence.
- Add startup warning when configured model is not approved.

## Priority 2 (Quality and Operations)

1. Confidence quality monitoring
- Track confidence distribution over time and by policy category.
- Flag confidence drift and unusual ambiguity spikes.

2. Golden-set evaluation suite
- Maintain labeled policy examples and expected structured outputs.
- Run regression checks on parser/prompt/model changes.

3. A/B testing framework for prompt/model improvements
- Controlled rollout by traffic slice.
- Compare parse accuracy, confidence, latency, and cost.

4. End-to-end traceability
- Propagate request IDs through frontend, API, parser, and simulation flow.
- Keep structured audit logs for debugging and support.

## Security and Secrets (Operational)

1. Secret management hardening
- Store keys in managed secrets system for production.
- Rotate OpenAI keys on a schedule.
- Keep environment-specific secret scopes per deployment stage.

2. Abuse detection rules
- Detect high-cardinality spam patterns and repeated adversarial prompts.
- Add temporary bans/challenges on abusive clients.

## Definition of Done for This Backlog

1. No single user can create unbounded parse cost.
2. Parser behavior is observable with actionable metrics/alerts.
3. Model/prompt changes are controlled, versioned, and measurable.
4. Multi-instance deployments keep consistent limits and cache behavior.
