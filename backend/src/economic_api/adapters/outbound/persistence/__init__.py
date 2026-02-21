"""In-memory repository implementation for MVP."""

from typing import Optional
from uuid import UUID

from ....domain.model.aggregates import Simulation
from ....domain.ports.repositories import SimulationRepository


class InMemorySimulationRepository(SimulationRepository):
    """
    In-memory implementation of simulation repository.

    MVP: Simple dictionary storage.
    v1: Will be replaced with PostgreSQL implementation.
    """

    def __init__(self) -> None:
        self._storage: dict[UUID, Simulation] = {}

    async def save(self, simulation: Simulation) -> None:
        """Save simulation to in-memory storage."""
        self._storage[simulation.id] = simulation

    async def get_by_id(self, simulation_id: UUID) -> Optional[Simulation]:
        """Get simulation by ID from in-memory storage."""
        return self._storage.get(simulation_id)

    async def list_all(self, limit: int = 100) -> list[Simulation]:
        """List all simulations from in-memory storage."""
        simulations = list(self._storage.values())
        return simulations[:limit]
