"""Repository interfaces (ports) for the domain layer."""

from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from ...model.aggregates import Simulation


class SimulationRepository(ABC):
    """Port (interface) for simulation persistence."""

    @abstractmethod
    async def save(self, simulation: Simulation) -> None:
        """Save a simulation."""
        pass

    @abstractmethod
    async def get_by_id(self, simulation_id: UUID) -> Optional[Simulation]:
        """Get a simulation by ID."""
        pass

    @abstractmethod
    async def list_all(self, limit: int = 100) -> list[Simulation]:
        """List all simulations."""
        pass
