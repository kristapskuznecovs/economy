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
