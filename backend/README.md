# Economic Simulation API

Backend API for the Latvia DSGE/CGE Political Tool.

## Architecture

This project follows **Event-Driven Hexagonal Architecture with CQRS** as documented in [../ADR.md](../ADR.md).

### Current Phase: MVP
- ✅ Hexagonal architecture (Ports & Adapters)
- ✅ Domain-Driven Design with aggregates
- ✅ Mock simulation engine (will be replaced with real DSGE/SAM solver in v1)
- ✅ In-memory repository (will be replaced with PostgreSQL in v1)
- ✅ FastAPI REST API with CORS

## Quick Start

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies (requires Python 3.11+)
pip install -e ".[dev]"
```

### Run Development Server

```bash
# From backend directory
uvicorn economic_api.main:app --reload --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Test the API

```bash
# Health check
curl http://localhost:8000/api/health

# Run a simulation
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"policy": "Simulate removing the 2nd pension pillar"}'

# Get results (use run_id from previous response)
curl http://localhost:8000/api/results/{run_id}
```

### Parser Production Controls

Set these environment variables for `POST /api/policy/parse` hardening:

```bash
# OpenAI parser behavior
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_MAX_RETRIES=2
OPENAI_REQUEST_TIMEOUT_SEC=30
OPENAI_CONNECT_TIMEOUT_SEC=5

# Input and parser limits
POLICY_MAX_CHARS=2000
OPENAI_PARSE_CACHE_SIZE=1000
OPENAI_PARSE_CACHE_TTL_SEC=1800

# Cost and abuse controls
OPENAI_COST_ALERT_USD=0.02
POLICY_PARSE_RATE_LIMIT_PER_MINUTE=30
POLICY_PARSE_RATE_LIMIT_MAX_KEYS=10000
TRUST_PROXY_HEADERS=false

# Open data budget source (used by GET /api/budget/vote-divisions)
BUDGET_CKAN_API_BASE=https://data.gov.lv/dati/api/3/action
BUDGET_DATASET_ID=ec81699b-3f04-4d9e-a305-8f9030c495cb
# Optional: pin a specific yearly resource
# BUDGET_RESOURCE_ID=c6a5b359-b328-41de-971f-9241e41c9039
BUDGET_DIVISIONS_DEFAULT_LIMIT=12
BUDGET_CACHE_TTL_SEC=21600
BUDGET_REQUEST_TIMEOUT_SEC=20
```

## Project Structure

```
backend/
├── src/
│   └── economic_api/
│       ├── domain/              # Core business logic (PURE)
│       │   ├── model/
│       │   │   ├── aggregates/  # Simulation, EconomicState
│       │   │   ├── value_objects/  # HorizonImpact, RegionalImpact
│       │   │   └── events/      # Domain events (future)
│       │   ├── services/        # MockSimulationEngine (→ real SAM solver in v1)
│       │   └── ports/           # Interfaces
│       │
│       ├── application/         # Use cases
│       │   ├── commands/        # RunSimulationCommand
│       │   ├── handlers/        # Command/query handlers
│       │   └── dto/             # API data transfer objects
│       │
│       ├── adapters/            # Infrastructure
│       │   ├── inbound/
│       │   │   └── api/         # FastAPI routers
│       │   └── outbound/
│       │       ├── persistence/ # InMemoryRepository (→ PostgreSQL in v1)
│       │       └── external/    # Future: CSP API, LLM clients
│       │
│       └── main.py              # FastAPI app
│
└── tests/                       # Tests (following ADR-009)
```

## API Endpoints

### Core Simulation

- `POST /api/simulate` - Start a new simulation
- `GET /api/status/{run_id}` - Get simulation status
- `GET /api/results/{run_id}` - Get simulation results
- `POST /api/policy/parse` - Parse policy text with confidence/clarification gating
- `GET /api/budget/vote-divisions` - Live ministry/resor expenditure shares from data.gov.lv
- `GET /api/budget/vote-divisions/history` - Yearly changes for one expenditure group (since base year)

### Health

- `GET /api/health` - Health check
- `GET /` - API info

## Development

### Running Tests

```bash
pytest
```

### Type Checking

```bash
mypy src/
```

### Linting

```bash
ruff check src/
```

## Next Steps (Roadmap)

### v1 (Weeks 9-16)
- [ ] Replace MockSimulationEngine with real DSGE/SAM solver
- [ ] Add PostgreSQL + TimescaleDB persistence
- [ ] Implement CQRS with Redis event bus
- [ ] Add WebSocket streaming for progress updates

### v2 (Weeks 17-26)
- [ ] LangGraph multi-agent orchestration
- [ ] Policy interpreter agent (LLM-powered)
- [ ] Auto-calibration orchestrator
- [ ] Data synthesis agent

## Architecture Decision Records

See [../ADR.md](../ADR.md) for all architectural decisions.
