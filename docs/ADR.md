# Architecture Decision Records (ADR)

## Meta Information
- **Project:** Economic Simulation System (Latvia DSGE/CGE Political Tool)
- **Date:** 2026-02-21
- **Status:** DRAFT - Initial architecture design for MVP
- **Version:** 1.0

---

## ADR-001: Event-Driven Hexagonal Architecture with CQRS

### Context

We are building an AI-heavy political/policy strategy tool for economic counterfactual analysis. The system must:

1. **Handle complex economic simulations** using SAM-based CGE models that take seconds/minutes to compute
2. **Support autonomous AI agents** running 24/7 (auto-calibration, data ingestion, policy interpretation)
3. **Provide real-time feedback** to users via streaming simulation progress
4. **Integrate multiple external systems** (CSP Latvia API, Eurostat API, LLM APIs)
5. **Maintain reproducibility** and defensibility (central bank/IMF standard)
6. **Scale from MVP to full multi-agent orchestration** (LangGraph workflows)

Key architectural challenges:
- Long-running simulations cannot block HTTP requests
- AI agents need to operate independently of HTTP request lifecycle
- Domain logic (economic calculations) must be testable without infrastructure
- Frontend needs fast reads while backend processes heavy writes
- System must support both synchronous API calls and asynchronous agent workflows

### Decision

We will adopt **Event-Driven Hexagonal Architecture with CQRS** structured as follows:

**Core Architectural Patterns:**
1. **Hexagonal (Ports & Adapters)** - Domain logic isolated from infrastructure
2. **CQRS (Command Query Responsibility Segregation)** - Separate write and read models
3. **Event-Driven** - Asynchronous communication via event bus
4. **Domain-Driven Design** - Rich domain model with aggregates and domain services

**Three-Layer Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: AI AGENTS (Autonomous, Event-Driven)                  │
│  - LangGraph multi-agent orchestration                          │
│  - Runs outside HTTP layer (separate Ray workers)               │
│  - Publishes/subscribes to domain events                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                    Event Bus (Redis Streams)
                          │
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: CORE DOMAIN (Pure Python, Framework-Agnostic)         │
│                                                                  │
│  ┌──────────────────────┐       ┌──────────────────────────┐   │
│  │   COMMAND SIDE       │       │      QUERY SIDE          │   │
│  │  (Write Model)       │       │    (Read Model)          │   │
│  ├──────────────────────┤       ├──────────────────────────┤   │
│  │ • RunSimulation      │       │ • GetSimulationResults   │   │
│  │ • ParsePolicy        │       │ • GetEconomicState       │   │
│  │ • IngestData         │       │ • GetParameters          │   │
│  └──────────────────────┘       └──────────────────────────┘   │
│                                                                  │
│  Domain Services: SAMBasedCGE, IOMultiplierEngine,             │
│                   SupplyConstraintChecker, FiscalCalculator     │
│                                                                  │
│  Aggregates: Simulation, EconomicState, PolicyInterpretation   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                    Ports (Interfaces)
                          │
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: ADAPTERS (Infrastructure Implementations)             │
│                                                                  │
│  Inbound (Primary):           Outbound (Secondary):             │
│  • FastAPI REST               • PostgreSQL + TimescaleDB        │
│  • WebSocket (streaming)      • Redis (events, cache)          │
│  • CLI commands               • CSP/Eurostat API clients        │
│                               • LLM clients (Claude/GPT)        │
└─────────────────────────────────────────────────────────────────┘
```

### Consequences

**Positive:**
- ✅ **Testability:** Domain logic can be tested without infrastructure (mock adapters)
- ✅ **Scalability:** CQRS allows read/write optimization independently
- ✅ **Agent autonomy:** Event-driven enables 24/7 agent operation
- ✅ **Flexibility:** Can swap adapters (mock data → real CSP API) without touching domain
- ✅ **Real-time UX:** WebSocket streaming provides instant feedback
- ✅ **Maintainability:** Clear boundaries between layers reduce coupling
- ✅ **Reproducibility:** Pure domain logic ensures consistent results

**Negative:**
- ⚠️ **Complexity:** More moving parts than simple CRUD (event bus, CQRS, agents)
- ⚠️ **Learning curve:** Team must understand DDD, CQRS, event-driven patterns
- ⚠️ **Operational overhead:** Requires Redis, event monitoring, distributed tracing
- ⚠️ **Eventual consistency:** Query side may lag behind command side (acceptable for our use case)

**Mitigation:**
- Start with in-memory event bus for MVP, add Redis later
- Mock adapters for all external systems during development
- Comprehensive documentation and ADRs for each major decision
- Gradual migration: Simple REST → Add events → Add agents (phased approach)

---

## ADR-002: FastAPI for REST API Layer

### Context

We need a Python web framework for the HTTP API layer that:
- Integrates well with our Python economic simulation core
- Supports async/await for long-running simulations
- Provides automatic API documentation
- Has strong typing support (Pydantic integration)
- Can handle WebSocket connections for streaming results

Alternatives considered:
- **Django REST Framework:** Mature but synchronous, heavyweight ORM not needed
- **Flask:** Lightweight but lacks built-in async support and validation
- **FastAPI:** Modern async framework with automatic OpenAPI docs

### Decision

We will use **FastAPI** for the REST API layer.

**Rationale:**
1. **Native async support** - Perfect for long-running simulations (don't block event loop)
2. **Pydantic validation** - Type-safe DTOs align with our CQRS command/query pattern
3. **Auto-generated OpenAPI docs** - Matches our [connection.md](connection.md) API spec requirements
4. **WebSocket support** - Built-in for streaming simulation progress
5. **Python-native** - No context switching from our economic core (NumPy/Pandas/JAX)
6. **Dependency injection** - Clean integration with our hexagonal ports
7. **Performance** - Starlette/Uvicorn stack is fast enough for our needs

### Consequences

**Positive:**
- ✅ Automatic API documentation (Swagger UI) for frontend team
- ✅ Type safety reduces bugs at API boundary
- ✅ Async handlers prevent blocking during simulations
- ✅ WebSocket support enables real-time progress updates

**Negative:**
- ⚠️ Younger ecosystem than Django (fewer third-party packages)
- ⚠️ Team must learn async/await patterns

**Mitigation:**
- Use well-established FastAPI patterns from official docs
- Async code isolated to API layer; domain remains synchronous

---

## ADR-003: PostgreSQL + TimescaleDB for Data Layer

### Context

We need to store:
1. **Time-series data** (economic indicators, quarterly GDP, employment by sector)
2. **Simulation results** (SAM matrices, regional impacts, scenario comparisons)
3. **Model parameters** (elasticities, calibration coefficients)
4. **Audit trail** (data provenance, parameter versions, reproducibility metadata)

Requirements:
- Time-series optimized (CSP Latvia data arrives quarterly)
- Support for complex queries (regional aggregations, sector breakdowns)
- ACID guarantees (reproducibility requires exact data snapshots)
- Version tracking (data revisions, parameter updates)

Alternatives considered:
- **ClickHouse:** Fast for analytics but lacks ACID, no mature Python ORM
- **InfluxDB:** Time-series optimized but weak relational model
- **PostgreSQL + TimescaleDB:** Relational + time-series extension

### Decision

We will use **PostgreSQL 15 + TimescaleDB** for all persistent data.

**Rationale:**
1. **TimescaleDB extension** - PostgreSQL with optimized time-series hypertables
2. **ACID compliance** - Critical for reproducible simulations
3. **Rich query capabilities** - Complex joins for SAM accounting identities
4. **pgvector extension** - Future: semantic search over past analyses (agent memory)
5. **Mature Python ecosystem** - SQLAlchemy, asyncpg support
6. **Operational simplicity** - Single database for all data types

**Data organization:**
```sql
-- Layer 1: Economic time-series data
CREATE TABLE economic_data (
  time TIMESTAMPTZ NOT NULL,
  country VARCHAR(2),
  metric VARCHAR(50),
  sector VARCHAR(10),
  value NUMERIC,
  source VARCHAR(50),
  revision INT DEFAULT 0,
  PRIMARY KEY (time, country, metric, sector, revision)
);
SELECT create_hypertable('economic_data', 'time');

-- Layer 2: Simulations and results
CREATE TABLE simulations (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  policy_text TEXT,
  parameters JSONB,
  status VARCHAR(20),
  results JSONB,
  sam_baseline JSONB,
  sam_counterfactual JSONB
);

-- Layer 2: Model parameters (versioned)
CREATE TABLE model_parameters (
  version VARCHAR(20) PRIMARY KEY,
  parameters JSONB,
  calibrated_at TIMESTAMPTZ,
  source_data_vintage VARCHAR(20)
);
```

### Consequences

**Positive:**
- ✅ Single database reduces operational complexity
- ✅ TimescaleDB compression saves storage (quarterly data over years)
- ✅ ACID ensures data integrity for reproducibility
- ✅ pgvector ready for future agent memory features

**Negative:**
- ⚠️ Not specialized for real-time analytics (but our data is quarterly, not millisecond)
- ⚠️ JSONB fields for SAM matrices less efficient than specialized formats

**Mitigation:**
- Use TimescaleDB continuous aggregates for common queries
- Consider parquet exports for large-scale analytics (v2)

---

## ADR-004: Redis for Event Bus and Caching

### Context

We need:
1. **Event bus** for domain events (SimulationStarted, DataIngested, etc.)
2. **Cache** for expensive queries (IO multiplier matrices, parameter sets)
3. **Job queue** for async agent tasks (policy parsing, calibration runs)
4. **Agent state** for multi-agent coordination

Alternatives considered:
- **RabbitMQ/Kafka:** Heavier infrastructure, overkill for MVP
- **In-memory event bus:** Simple but loses events on restart
- **Redis Streams:** Lightweight, persistent, supports pub/sub + queues

### Decision

We will use **Redis** for event bus, caching, and agent coordination.

**Implementation:**
- **Redis Streams:** Domain event bus (persistent, replayable)
- **Redis Pub/Sub:** Real-time WebSocket notifications (ephemeral)
- **Redis Cache:** LRU cache for IO tables, parameter sets
- **Redis Hashes:** Agent state storage (current task, progress)

**Event flow:**
```
1. Command: POST /simulate → RunSimulation command
2. Command handler: Publishes SimulationStarted event → Redis Stream
3. Agent: Consumes event, runs SAM solver
4. Agent: Publishes progress events → Redis Pub/Sub
5. WebSocket: Streams progress to frontend
6. Agent: Publishes SimulationCompleted event → Redis Stream
7. Query handler: Builds read model from events
```

### Consequences

**Positive:**
- ✅ Lightweight (single Redis instance for MVP)
- ✅ Persistent events (Redis Streams with AOF persistence)
- ✅ Fast pub/sub for WebSocket streaming
- ✅ Agent coordination built-in (distributed locks, shared state)

**Negative:**
- ⚠️ Single point of failure (mitigated by Redis persistence)
- ⚠️ Not a full message queue (no dead letter queue, retries)

**Mitigation:**
- Use Redis AOF persistence (append-only file)
- Add retry logic in application layer
- Consider RabbitMQ for v2 if complexity grows

---

## ADR-005: CQRS with Eventual Consistency

### Context

Our system has asymmetric read/write patterns:
- **Writes (Commands):** Heavy, infrequent (running simulations takes seconds/minutes)
- **Reads (Queries):** Light, frequent (dashboard refreshes, parameter lookups)

Traditional CRUD mixes these concerns, leading to:
- Slow reads (queries hit write-optimized tables)
- Complex models (single model serves both purposes)
- Poor caching (cache invalidation on every write)

### Decision

We will implement **CQRS (Command Query Responsibility Segregation)**.

**Command Side (Write Model):**
- Handles: `RunSimulation`, `IngestData`, `UpdateParameters`
- Writes to: PostgreSQL (normalized relational tables)
- Returns: Command ID, publishes event
- Optimized for: Data integrity, audit trail

**Query Side (Read Model):**
- Handles: `GetSimulationResults`, `GetEconomicState`, `GetParameters`
- Reads from: Denormalized views, Redis cache
- Returns: Immediately (no blocking on write operations)
- Optimized for: Fast reads, dashboard performance

**Event-driven sync:**
```
Command → Event published → Query model updated asynchronously
```

**Example:**
```python
# Command: Start simulation
POST /simulate
{
  "policy": "Remove 2nd pension pillar",
  "horizon_quarters": 20
}
→ Returns immediately: { "run_id": "abc123", "status": "pending" }
→ Publishes: SimulationStarted event

# Query: Get results (may not be ready yet)
GET /results/abc123
→ Returns: { "status": "running", "progress": 0.42 }

# After simulation completes:
SimulationCompleted event → Query model updated

GET /results/abc123
→ Returns: { "status": "completed", "gdp_impact": {...}, ... }
```

### Consequences

**Positive:**
- ✅ **Fast reads:** Query side can be heavily cached and denormalized
- ✅ **Non-blocking writes:** Simulations don't block API responses
- ✅ **Independent scaling:** Can scale read/write sides separately
- ✅ **Clear separation:** Commands change state, queries never do

**Negative:**
- ⚠️ **Eventual consistency:** Query side lags behind command side (100-500ms typical)
- ⚠️ **Complexity:** Two models to maintain instead of one
- ⚠️ **Duplicate code:** Some logic appears in both sides

**Mitigation:**
- **Acceptable lag:** Our use case tolerates eventual consistency (simulations take seconds anyway)
- **Shared domain:** Command and query sides share domain events
- **Progressive enhancement:** Start simple, add denormalization only where needed

---

## ADR-006: Domain-Driven Design with Aggregates

### Context

Our economic simulation domain is complex:
- SAM-based CGE model with 15+ equations and closure rules
- Multi-sector Input-Output tables with dependencies
- Regional allocation with location quotients
- Fiscal calculations with tax/subsidy mapping
- Supply-side capacity constraints

We need to organize this complexity to ensure:
- Business rules are enforced consistently
- Domain logic is testable without infrastructure
- Changes are traceable (who, when, why)
- Invariants are protected (SAM must balance, GDP identity must hold)

### Decision

We will use **Domain-Driven Design (DDD)** with tactical patterns:

**1. Aggregates (Consistency Boundaries):**

**Simulation Aggregate (Root):**
```python
class Simulation:
    """
    Aggregate root for a single simulation run.
    Enforces invariants: SAM must balance, results must match parameters.
    """
    id: SimulationId
    policy_text: str
    parameters: SimulationParameters
    status: SimulationStatus  # pending, running, completed, failed
    sam_baseline: SAM
    sam_counterfactual: SAM
    results: SimulationResults

    def start(self) -> None:
        """Business logic: Can only start if status is pending"""
        if self.status != SimulationStatus.PENDING:
            raise InvalidStateError("Cannot start non-pending simulation")
        self.status = SimulationStatus.RUNNING
        self._publish_event(SimulationStarted(self.id))

    def complete(self, results: SimulationResults) -> None:
        """Business logic: Must validate SAM balances"""
        if not self._sam_is_balanced(results.sam_counterfactual):
            raise SAMValidationError("Counterfactual SAM does not balance")
        self.results = results
        self.status = SimulationStatus.COMPLETED
        self._publish_event(SimulationCompleted(self.id, results))
```

**EconomicState Aggregate:**
```python
class EconomicState:
    """
    Current economic baseline (latest quarter data).
    Enforces invariants: GDP identity must hold, no negative values.
    """
    as_of_date: Date
    sam: SAM
    time_series: dict[str, TimeSeries]
    io_table: IOTable
    parameters: ModelParameters

    def update_from_ingestion(self, new_data: IngestedData) -> None:
        """Business logic: Validate data quality before updating"""
        if not self._gdp_identity_holds(new_data):
            raise GDPIdentityError("GDP_output != GDP_expenditure")
        self._merge_time_series(new_data)
        self._publish_event(EconomicStateUpdated(self.as_of_date))
```

**2. Domain Services (Complex Logic Not Belonging to Single Aggregate):**

```python
class SAMBasedCGE:
    """
    Domain service: Solves general equilibrium model.
    Too complex for single aggregate, uses multiple aggregates as inputs.
    """
    def solve_counterfactual(
        self,
        baseline: EconomicState,
        policy: PolicyInterpretation
    ) -> SAM:
        # Complex economic logic here
        pass

class IOMultiplierEngine:
    """Domain service: Calculates Input-Output multipliers"""
    def calculate_multipliers(self, io_table: IOTable) -> MultiplierMatrix:
        pass
```

**3. Value Objects (Immutable, No Identity):**

```python
@dataclass(frozen=True)
class HorizonImpact:
    """Value object: GDP/employment impact at specific time horizon"""
    year: int
    gdp_real_pct: float
    employment_jobs: int
    budget_balance_eur_m: float
```

**4. Domain Events:**

```python
@dataclass(frozen=True)
class SimulationStarted:
    simulation_id: SimulationId
    timestamp: datetime
    policy_text: str

@dataclass(frozen=True)
class SimulationCompleted:
    simulation_id: SimulationId
    timestamp: datetime
    results: SimulationResults
```

### Consequences

**Positive:**
- ✅ **Protected invariants:** SAM balance, GDP identity enforced in domain
- ✅ **Testable logic:** Aggregates are pure Python, no infrastructure
- ✅ **Clear ownership:** Each aggregate owns its consistency boundary
- ✅ **Event sourcing ready:** Domain events enable audit trail

**Negative:**
- ⚠️ **Learning curve:** Team must understand DDD patterns
- ⚠️ **More classes:** More files/classes than anemic domain model

**Mitigation:**
- Start with key aggregates (Simulation, EconomicState)
- Add domain services gradually as complexity grows
- Document aggregate boundaries and invariants clearly

---

## ADR-007: AI Agent Layer Separation

### Context

Our system has two distinct operational modes:
1. **Synchronous API mode:** User requests simulation → returns results (seconds)
2. **Autonomous agent mode:** Agents run 24/7 (auto-calibration, data ingestion)

Challenges if agents run inside API layer:
- Agents would restart on every deployment
- Agent state tied to HTTP request lifecycle
- Cannot run long-term autonomous workflows (tree-of-thought reasoning)
- Difficult to monitor agent-to-agent communication

### Decision

We will implement **Layer 3 (AI Agents) as separate processes** outside the HTTP layer.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (HTTP Layer)                                        │
│  - Handles REST requests                                     │
│  - Publishes commands to event bus                           │
│  - Subscribes to events for WebSocket streaming              │
└─────────────────────────────────────────────────────────────┘
                          │
                    Redis Event Bus
                          │
┌─────────────────────────────────────────────────────────────┐
│  Agent Workers (Separate Processes - Ray Distributed)        │
│                                                               │
│  Master Policy Analyst Agent (always running)                │
│  ├─ Listens for SimulationStarted events                    │
│  ├─ Spawns specialist agents (tree-of-thought workflow)     │
│  └─ Publishes SimulationCompleted event                     │
│                                                               │
│  Auto-Calibration Orchestrator (cron: daily)                │
│  ├─ Checks for new CSP data                                 │
│  ├─ Spawns Data Synthesis Agent if gaps found               │
│  └─ Updates model parameters autonomously                   │
└─────────────────────────────────────────────────────────────┘
```

**Agent lifecycle:**
- Deployed separately from FastAPI app
- Managed by Ray (distributed Python framework)
- State persisted in Redis between runs
- LangGraph workflows for multi-agent coordination

### Consequences

**Positive:**
- ✅ **Agent autonomy:** 24/7 operation independent of API deployments
- ✅ **Scalability:** Agents can run on separate machines (Ray distributed)
- ✅ **Fault isolation:** Agent crash doesn't take down API
- ✅ **Better monitoring:** Agent metrics separate from HTTP metrics

**Negative:**
- ⚠️ **Operational complexity:** Two deployment units (API + agents)
- ⚠️ **Debugging harder:** Distributed traces across processes

**Mitigation:**
- **MVP:** Run agents in same process, separate threads (simpler)
- **v1:** Separate processes on same machine
- **v2:** Distributed Ray cluster for scale
- Use structured logging + distributed tracing (OpenTelemetry)

---

## ADR-008: Progressive Migration Strategy (MVP → v1 → v2)

### Context

We have a large architectural vision but limited time for MVP (3-6 months).

Risk: Over-engineering the MVP could delay delivery and waste effort if requirements change.

### Decision

We will implement a **progressive migration strategy** with three phases:

### Phase 1: MVP (Weeks 1-8) - Simplified Hexagonal
**Goal:** Working API with mock economic engine

```
Backend:
├── domain/              # Basic aggregates (Simulation, EconomicState)
│   ├── model/
│   └── services/        # Mock SAM solver (returns hardcoded results)
├── application/         # Simple commands/queries (no CQRS yet)
├── adapters/
│   ├── api/             # FastAPI REST (no WebSocket)
│   └── persistence/     # In-memory repositories (no Postgres)
└── main.py

Frontend:
└── (Already exists) - Connect to mock API
```

**Deliverable:** Frontend shows hardcoded simulation results via REST API

**Omit for MVP:**
- PostgreSQL (use in-memory)
- Redis event bus (direct calls)
- CQRS (single model)
- Agents (manual policy parsing)
- WebSocket streaming

### Phase 2: v1 (Weeks 9-16) - Add CQRS + Real Economic Engine
**Goal:** Working simulations with real DSGE/SAM solver

**Add:**
- ✅ PostgreSQL + TimescaleDB for persistence
- ✅ CQRS: Separate command/query handlers
- ✅ Redis event bus for async processing
- ✅ WebSocket streaming for progress updates
- ✅ Real SAM-based CGE solver (from [dsge_latvia/](dsge_latvia/))

**Deliverable:** Users can run real economic simulations, see progress in real-time

### Phase 3: v2 (Weeks 17-26) - Full Agent Orchestration
**Goal:** Autonomous AI system with 24/7 operation

**Add:**
- ✅ LangGraph multi-agent workflows
- ✅ Ray distributed agent execution
- ✅ Auto-calibration orchestrator
- ✅ Policy interpreter agent (LLM-powered)
- ✅ Data synthesis agent
- ✅ Scenario generator agent

**Deliverable:** Fully autonomous system with natural language policy interpretation

### Migration Rules:
1. **No breaking changes:** Each phase must be backward compatible
2. **Feature flags:** New features behind environment variables
3. **Parallel implementations:** Keep old code until new code proven
4. **Incremental refactoring:** Refactor one layer at a time

### Consequences

**Positive:**
- ✅ **Fast iteration:** MVP in 8 weeks vs 26 weeks for full system
- ✅ **Risk mitigation:** Test architecture incrementally
- ✅ **Early feedback:** Users can test MVP before agents built
- ✅ **Learning:** Team learns patterns progressively

**Negative:**
- ⚠️ **Technical debt:** May need refactoring between phases
- ⚠️ **Duplicate code:** Temporary mock implementations

**Mitigation:**
- Clear phase boundaries (documented in ADRs)
- Refactoring budget allocated between phases
- Automated tests prevent regressions

---

## ADR-009: Testing Strategy (Hexagonal Enabler)

### Context

Hexagonal architecture enables testing at multiple levels. We need a strategy that:
- Tests domain logic in isolation (no infrastructure)
- Tests adapters independently (mock domain)
- Tests full system end-to-end

### Decision

We will implement a **three-tier testing pyramid**:

### Level 1: Unit Tests (Domain Layer - 60% of tests)
**What:** Test aggregates, domain services, value objects in pure Python
**No infrastructure:** No database, no Redis, no HTTP, no LLM calls

```python
# tests/unit/domain/test_simulation.py
def test_simulation_cannot_start_if_already_running():
    sim = Simulation(status=SimulationStatus.RUNNING)

    with pytest.raises(InvalidStateError):
        sim.start()

# tests/unit/domain/services/test_sam_solver.py
def test_sam_solver_enforces_balance():
    solver = SAMBasedCGE()
    baseline = create_valid_sam()
    policy = PolicyInterpretation(spending_increase=30)

    result_sam = solver.solve_counterfactual(baseline, policy)

    assert sam_is_balanced(result_sam)  # Row sums = column sums
    assert gdp_identity_holds(result_sam)
```

### Level 2: Integration Tests (Adapter Layer - 30% of tests)
**What:** Test adapters with real infrastructure (test database, test Redis)
**Use test doubles:** Mock external APIs (CSP, LLMs)

```python
# tests/integration/adapters/test_postgres_repository.py
@pytest.fixture
def test_db():
    # Spin up PostgreSQL test container
    yield db
    # Tear down

def test_simulation_repository_saves_and_loads(test_db):
    repo = PostgresSimulationRepository(test_db)
    sim = Simulation(...)

    repo.save(sim)
    loaded = repo.get_by_id(sim.id)

    assert loaded == sim
```

### Level 3: E2E Tests (Full System - 10% of tests)
**What:** Test entire system via HTTP API
**Real infrastructure:** PostgreSQL, Redis, all adapters

```python
# tests/e2e/test_simulation_workflow.py
def test_user_can_run_simulation_and_get_results(api_client):
    # 1. Start simulation
    response = api_client.post("/simulate", json={
        "policy": "Remove 2nd pension pillar",
        "horizon_quarters": 20
    })
    run_id = response.json()["run_id"]

    # 2. Poll for completion
    while True:
        status = api_client.get(f"/results/{run_id}")
        if status.json()["status"] == "completed":
            break
        time.sleep(0.5)

    # 3. Verify results
    results = status.json()
    assert results["gdp_impact"]["year_1"] < 0  # Negative impact expected
```

### Test Doubles Strategy:
```python
# Mock adapter for external LLM (replaces Claude API in tests)
class MockPolicyParser(PolicyParserPort):
    def parse(self, policy_text: str) -> PolicyInterpretation:
        # Deterministic parsing for tests
        if "remove" in policy_text.lower() and "pension" in policy_text.lower():
            return PolicyInterpretation(
                transfer_reduction=200,  # 200M EUR
                confidence=0.85
            )
        return PolicyInterpretation(confidence=0.0)
```

### Consequences

**Positive:**
- ✅ **Fast unit tests:** No database/network I/O (run in milliseconds)
- ✅ **Reliable tests:** Domain tests never flake (no external dependencies)
- ✅ **Test-driven development:** Can write domain tests before infrastructure
- ✅ **Hexagonal validation:** Architecture forces testability

**Negative:**
- ⚠️ **More test code:** Need to maintain mock adapters
- ⚠️ **Test database overhead:** Integration tests slower

**Mitigation:**
- Use pytest fixtures for test database setup
- Run E2E tests only in CI, not locally
- Shared test utilities for common mocks

---

## Decision Summary Table

| ADR | Decision | Status | Phase |
|-----|----------|--------|-------|
| ADR-001 | Event-Driven Hexagonal + CQRS | **APPROVED** | v1 |
| ADR-002 | FastAPI for REST API | **APPROVED** | MVP |
| ADR-003 | PostgreSQL + TimescaleDB | **APPROVED** | v1 |
| ADR-004 | Redis for Events/Cache | **APPROVED** | v1 |
| ADR-005 | CQRS with Eventual Consistency | **APPROVED** | v1 |
| ADR-006 | DDD with Aggregates | **APPROVED** | MVP |
| ADR-007 | Separate Agent Layer | **APPROVED** | v2 |
| ADR-008 | Progressive Migration (MVP→v1→v2) | **APPROVED** | All |
| ADR-009 | Three-Tier Testing Strategy | **APPROVED** | MVP |

---

## Next ADRs to Document

Future architectural decisions to be documented as project progresses:

- **ADR-010:** LangGraph workflow structure for multi-agent orchestration
- **ADR-011:** Agent permission matrix and governance controls
- **ADR-012:** Parameter versioning and model reproducibility strategy
- **ADR-013:** WebSocket protocol for streaming simulation progress
- **ADR-014:** SAM validation and closure rule enforcement
- **ADR-015:** External data source integration strategy (CSP, Eurostat)
- **ADR-016:** Monitoring and observability stack (Prometheus, Grafana)
- **ADR-017:** Deployment strategy (Docker, Kubernetes, or serverless)

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-02-21 | 1.0 | Initial | Created ADR document with 9 core architectural decisions |

---

## References

- [PLAN.md](PLAN.md) - Full system architecture and economic modeling approach
- [connection.md](connection.md) - API specification and data sources
- [LOVABLE_COMBINED_SPEC.md](LOVABLE_COMBINED_SPEC.md) - Frontend requirements
- [dsge_latvia/](dsge_latvia/) - DSGE model implementation
