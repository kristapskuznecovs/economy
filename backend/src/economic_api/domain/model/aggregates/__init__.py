"""Aggregates for the economic simulation domain."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from ..value_objects import (
    ConfidenceLevel,
    HorizonImpact,
    InvestmentImpact,
    RegionalImpact,
    SimulationStatus,
)


@dataclass
class SimulationParameters:
    """Parameters for running a simulation."""

    policy_text: str
    country: str = "LV"
    horizon_quarters: int = 20


@dataclass
class SimulationResults:
    """Results from a completed simulation."""

    scenario_id: str
    title: str
    policy_changes: list[str]
    horizon_impacts: list[HorizonImpact]
    regional_impacts: list[RegionalImpact]
    investment_impacts: list[InvestmentImpact]
    model_name: str
    model_version: str
    confidence: ConfidenceLevel
    assumptions: list[str]
    caveats: list[str]
    causal_chain: list[str]
    key_drivers: list[str]
    winners: list[str]
    losers: list[str]


@dataclass
class Simulation:
    """
    Aggregate root for a simulation run.

    Enforces business rules:
    - Can only start if status is PENDING
    - Can only complete if status is RUNNING
    - Cannot modify completed simulations
    """

    id: UUID = field(default_factory=uuid4)
    parameters: Optional[SimulationParameters] = None
    status: SimulationStatus = SimulationStatus.PENDING
    results: Optional[SimulationResults] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    def start(self) -> None:
        """Start the simulation. Business rule: can only start if pending."""
        if self.status != SimulationStatus.PENDING:
            raise ValueError(f"Cannot start simulation with status {self.status}")
        self.status = SimulationStatus.RUNNING
        self.started_at = datetime.utcnow()

    def complete(self, results: SimulationResults) -> None:
        """Complete the simulation. Business rule: can only complete if running."""
        if self.status != SimulationStatus.RUNNING:
            raise ValueError(f"Cannot complete simulation with status {self.status}")
        self.status = SimulationStatus.COMPLETED
        self.results = results
        self.completed_at = datetime.utcnow()

    def fail(self, error_message: str) -> None:
        """Mark simulation as failed."""
        if self.status not in [SimulationStatus.PENDING, SimulationStatus.RUNNING]:
            raise ValueError(f"Cannot fail simulation with status {self.status}")
        self.status = SimulationStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.utcnow()

    def is_finished(self) -> bool:
        """Check if simulation has finished (completed or failed)."""
        return self.status in [SimulationStatus.COMPLETED, SimulationStatus.FAILED]
