"""Command and query handlers for the application layer."""

import asyncio
from typing import Optional
from uuid import UUID

from ...domain.model.aggregates import Simulation, SimulationParameters
from ...domain.ports.repositories import SimulationRepository
from ...domain.services import MockSimulationEngine
from ..commands import RunSimulationCommand


class SimulationCommandHandler:
    """Handles simulation commands."""

    def __init__(
        self, repository: SimulationRepository, engine: MockSimulationEngine
    ) -> None:
        self.repository = repository
        self.engine = engine

    async def handle_run_simulation(self, command: RunSimulationCommand) -> UUID:
        """
        Handle RunSimulationCommand.

        MVP: Synchronous simulation (blocks until complete).
        v1: Asynchronous with event publishing.
        """
        # Create simulation aggregate
        simulation = Simulation(
            parameters=SimulationParameters(
                policy_text=command.policy_text,
                country=command.country,
                horizon_quarters=command.horizon_quarters,
            )
        )

        # Save in pending state
        await self.repository.save(simulation)

        # Start simulation
        simulation.start()
        await self.repository.save(simulation)

        # Run simulation (mock engine)
        # MVP: Simulate async work with small delay
        await asyncio.sleep(0.5)  # Simulate computation time
        results = self.engine.simulate(command.policy_text)

        # Complete simulation
        simulation.complete(results)
        await self.repository.save(simulation)

        return simulation.id


class SimulationQueryHandler:
    """Handles simulation queries."""

    def __init__(self, repository: SimulationRepository) -> None:
        self.repository = repository

    async def get_simulation(self, simulation_id: UUID) -> Optional[Simulation]:
        """Get simulation by ID."""
        return await self.repository.get_by_id(simulation_id)

    async def list_simulations(self, limit: int = 100) -> list[Simulation]:
        """List all simulations."""
        return await self.repository.list_all(limit)
