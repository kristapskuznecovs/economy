"""Command objects for the application layer."""

from dataclasses import dataclass
from uuid import UUID


@dataclass
class RunSimulationCommand:
    """Command to run a new simulation."""

    policy_text: str
    country: str = "LV"
    horizon_quarters: int = 20


@dataclass
class GetSimulationQuery:
    """Query to get simulation results."""

    simulation_id: UUID
