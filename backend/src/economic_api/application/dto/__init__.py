"""Data Transfer Objects (DTOs) for API layer."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Request DTOs
class SimulateRequest(BaseModel):
    """Request to start a simulation."""

    policy: str = Field(..., description="Natural language policy description")
    country: str = Field(default="LV", description="Country code")
    horizon_quarters: int = Field(default=20, ge=1, le=60, description="Forecast horizon in quarters")


class PolicyParseRequestDTO(BaseModel):
    """Request to parse natural-language policy into structured parameters."""

    policy: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language policy description",
    )
    country: str = Field(
        default="LV",
        min_length=2,
        max_length=3,
        pattern=r"^[A-Za-z]{2,3}$",
        description="Country code (ISO alpha-2 or alpha-3)",
    )
    clarification_answers: Optional[dict[str, str]] = Field(
        default=None,
        description="Optional answers to clarification questions from a previous parse",
    )


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


class PolicyInterpretationDTO(BaseModel):
    """Structured interpretation of policy text."""

    policy_type: Literal["immigration_processing", "subsidy", "tax_change", "regulation", "reallocation"]
    category: str
    parameter_changes: dict[str, Any]
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    ambiguities: list[str] = Field(default_factory=list)
    clarification_needed: bool = False
    clarification_questions: list[str] = Field(default_factory=list)


class PolicyParseResponseDTO(BaseModel):
    """Policy parse response with confidence gate decision."""

    interpretation: PolicyInterpretationDTO
    decision: Literal[
        "auto_proceed",
        "proceed_with_warning",
        "require_confirmation",
        "blocked_for_clarification",
    ]
    can_simulate: bool
    warning: Optional[str] = None
    parser_used: Literal["openai", "rule_based"]
    parser_error: Optional[str] = None


class BudgetVoteDivisionDTO(BaseModel):
    """One ministry/resor expenditure division for the selected period."""

    id: str
    label: str
    vote_division: str
    amount_eur_m: float
    share_pct: float
    cents_from_euro: float


class BudgetVoteDivisionsResponseDTO(BaseModel):
    """Aggregated budget expenditure divisions for infographic/table views."""

    year: int
    month: int
    month_name: str
    total_expenditure_eur_m: float
    source_dataset_id: str
    source_resource_id: str
    source_last_modified: Optional[str] = None
    source_url: Optional[str] = None
    divisions: list[BudgetVoteDivisionDTO]


class BudgetVoteDivisionGroupSummaryDTO(BaseModel):
    """One available expenditure group for history explorer."""

    id: str
    label: str
    latest_amount_eur_m: float
    latest_share_pct: float


class BudgetVoteDivisionHistoryPointDTO(BaseModel):
    """Yearly value and deltas for selected expenditure group."""

    year: int
    month: int
    month_name: str
    amount_eur_m: float
    change_from_base_eur_m: float
    change_from_base_pct: Optional[float] = None
    change_yoy_eur_m: Optional[float] = None
    change_yoy_pct: Optional[float] = None


class BudgetVoteDivisionHistoryResponseDTO(BaseModel):
    """History series for one selected expenditure group."""

    since_year: int
    to_year: int
    selected_group_id: str
    selected_group_label: str
    total_expenditure_latest_eur_m: float
    source_dataset_id: str
    source_resource_ids: list[str]
    groups: list[BudgetVoteDivisionGroupSummaryDTO]
    series: list[BudgetVoteDivisionHistoryPointDTO]


class BudgetRevenueSourceDetailDTO(BaseModel):
    """Detailed line within one revenue source category."""

    label: str
    amount_eur_m: float
    share_of_category_pct: float


class BudgetRevenueSourceDTO(BaseModel):
    """One revenue source bucket with YoY change."""

    id: str
    label: str
    amount_eur_m: float
    share_pct: float
    change_yoy_eur_m: Optional[float] = None
    change_yoy_pct: Optional[float] = None
    details: list[BudgetRevenueSourceDetailDTO] = Field(default_factory=list)


class BudgetRevenueSourcesHistoryResponseDTO(BaseModel):
    """Revenue source distribution for one selected year."""

    since_year: int
    to_year: int
    selected_year: int
    selected_month: int
    selected_month_name: str
    total_revenue_eur_m: float
    source_dataset_id: str
    source_resource_ids: list[str]
    available_years: list[int]
    categories: list[BudgetRevenueSourceDTO]


class TradePartnerValueDTO(BaseModel):
    """Trade values for one partner country."""

    country_code: str
    country_name_lv: str
    country_name_en: str
    exports_eur_m: float
    imports_eur_m: float
    balance_eur_m: float
    total_trade_eur_m: float
    share_of_total_trade_pct: float


class TradeOverviewResponseDTO(BaseModel):
    """Trade overview for selected year."""

    since_year: int
    to_year: int
    selected_year: int
    total_exports_eur_m: float
    total_imports_eur_m: float
    trade_balance_eur_m: float
    source_dataset_id: str
    source_resource_id: str
    country_map_resource_id: str
    available_years: list[int]
    partners: list[TradePartnerValueDTO]


class EconomyExportGroupDTO(BaseModel):
    """Export value share for one economy group."""

    id: str
    amount_eur_m: float
    share_pct: float


class EconomyStructureResponseDTO(BaseModel):
    """Economy structure metrics for selected year."""

    since_year: int
    to_year: int
    selected_year: int
    available_years: list[int]
    production_share_pct: Optional[float] = None
    services_share_pct: Optional[float] = None
    agriculture_share_pct: Optional[float] = None
    industry_share_pct: Optional[float] = None
    manufacturing_exports_share_pct: Optional[float] = None
    ict_services_exports_share_pct: Optional[float] = None
    remittances_usd_m: Optional[float] = None
    remittances_share_gdp_pct: Optional[float] = None
    total_exports_eur_m: float
    export_groups: list[EconomyExportGroupDTO]
    source_trade_dataset_id: str
    source_trade_resource_id: str
    source_world_bank_country: str
