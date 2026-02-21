"""Data Transfer Objects (DTOs) for API layer."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Request DTOs
class SimulateRequest(BaseModel):
    """Request to start a simulation."""

    policy: str = Field(..., description="Natural language policy description")
    country: str = Field(default="LV", description="Country code")
    horizon_quarters: int = Field(default=20, ge=1, le=60, description="Forecast horizon in quarters")


# Response DTOs
class HorizonImpactDTO(BaseModel):
    """Economic impact at a specific time horizon."""

    year: int
    budget_balance_eur_m: float
    revenues_eur_m: float
    expenditures_eur_m: float
    gdp_real_pct: float
    employment_jobs: int
    inflation_pp: float


class RegionalImpactDTO(BaseModel):
    """Economic impact for a specific region."""

    area: str
    year: int
    gdp_real_pct: float
    employment_jobs: int
    income_tax_eur_m: float
    social_spending_eur_m: float
    direction: Literal["increase", "decrease", "neutral"]


class InvestmentImpactDTO(BaseModel):
    """Investment impact breakdown."""

    year: int
    public_investment_eur_m: float
    private_investment_eur_m: float
    fdi_investment_eur_m: float
    total_investment_eur_m: float
    direction: Literal["increase", "decrease"]
    explanation: str


class SimulationResultsDTO(BaseModel):
    """Complete simulation results."""

    scenario_id: str
    title: str
    policy_changes: list[str]
    horizon_impacts: list[HorizonImpactDTO]
    regional_impacts: list[RegionalImpactDTO]
    investment_impacts: list[InvestmentImpactDTO]
    model_name: str
    model_version: str
    confidence: str
    assumptions: list[str]
    caveats: list[str]
    causal_chain: list[str]
    key_drivers: list[str]
    winners: list[str]
    losers: list[str]


class SimulationStatusDTO(BaseModel):
    """Simulation status response."""

    run_id: UUID
    status: Literal["pending", "running", "completed", "failed"]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class SimulationResponseDTO(BaseModel):
    """Response after starting a simulation."""

    run_id: UUID
    status: str


class SimulationDetailsDTO(BaseModel):
    """Full simulation details including results."""

    run_id: UUID
    status: Literal["pending", "running", "completed", "failed"]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    policy_text: str
    results: Optional[SimulationResultsDTO] = None
    error_message: Optional[str] = None
