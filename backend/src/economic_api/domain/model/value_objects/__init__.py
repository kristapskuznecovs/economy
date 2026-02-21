"""Value objects for the economic simulation domain."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal


@dataclass(frozen=True)
class HorizonImpact:
    """Economic impact at a specific time horizon."""

    year: int
    budget_balance_eur_m: float
    revenues_eur_m: float
    expenditures_eur_m: float
    gdp_real_pct: float
    employment_jobs: int
    inflation_pp: float


@dataclass(frozen=True)
class RegionalImpact:
    """Economic impact for a specific region."""

    area: str
    year: int
    gdp_real_pct: float
    employment_jobs: int
    income_tax_eur_m: float
    social_spending_eur_m: float
    direction: Literal["increase", "decrease", "neutral"]


@dataclass(frozen=True)
class InvestmentImpact:
    """Investment impact breakdown."""

    year: int
    public_investment_eur_m: float
    private_investment_eur_m: float
    fdi_investment_eur_m: float
    total_investment_eur_m: float
    direction: Literal["increase", "decrease"]
    explanation: str


class SimulationStatus(str, Enum):
    """Status of a simulation run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ConfidenceLevel(str, Enum):
    """Confidence level of simulation results."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
