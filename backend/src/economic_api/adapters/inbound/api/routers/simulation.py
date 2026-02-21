"""Simulation API router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from .....application.commands import RunSimulationCommand
from .....application.dto import (
    SimulationDetailsDTO,
    SimulationResponseDTO,
    SimulationResultsDTO,
    SimulationStatusDTO,
    SimulateRequest,
    HorizonImpactDTO,
    RegionalImpactDTO,
    InvestmentImpactDTO,
)
from .....application.handlers import SimulationCommandHandler, SimulationQueryHandler
from ..dependencies import get_command_handler, get_query_handler

router = APIRouter(prefix="/api", tags=["simulation"])


@router.post("/simulate", response_model=SimulationResponseDTO)
async def simulate(
    request: SimulateRequest,
    handler: Annotated[SimulationCommandHandler, Depends(get_command_handler)],
) -> SimulationResponseDTO:
    """
    Start a new simulation.

    Accepts a natural language policy description and returns a simulation run ID.
    The simulation runs asynchronously (in MVP, it completes quickly but in v1 it may take longer).
    """
    command = RunSimulationCommand(
        policy_text=request.policy,
        country=request.country,
        horizon_quarters=request.horizon_quarters,
    )

    run_id = await handler.handle_run_simulation(command)

    return SimulationResponseDTO(run_id=run_id, status="completed")


@router.get("/status/{run_id}", response_model=SimulationStatusDTO)
async def get_status(
    run_id: UUID,
    handler: Annotated[SimulationQueryHandler, Depends(get_query_handler)],
) -> SimulationStatusDTO:
    """Get the status of a simulation run."""
    simulation = await handler.get_simulation(run_id)

    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return SimulationStatusDTO(
        run_id=simulation.id,
        status=simulation.status.value,
        created_at=simulation.created_at,
        started_at=simulation.started_at,
        completed_at=simulation.completed_at,
    )


@router.get("/results/{run_id}", response_model=SimulationDetailsDTO)
async def get_results(
    run_id: UUID,
    handler: Annotated[SimulationQueryHandler, Depends(get_query_handler)],
) -> SimulationDetailsDTO:
    """Get the full results of a completed simulation."""
    simulation = await handler.get_simulation(run_id)

    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found")

    # Convert results to DTO if available
    results_dto = None
    if simulation.results:
        results_dto = SimulationResultsDTO(
            scenario_id=simulation.results.scenario_id,
            title=simulation.results.title,
            policy_changes=simulation.results.policy_changes,
            horizon_impacts=[
                HorizonImpactDTO(
                    year=h.year,
                    budget_balance_eur_m=h.budget_balance_eur_m,
                    revenues_eur_m=h.revenues_eur_m,
                    expenditures_eur_m=h.expenditures_eur_m,
                    gdp_real_pct=h.gdp_real_pct,
                    employment_jobs=h.employment_jobs,
                    inflation_pp=h.inflation_pp,
                )
                for h in simulation.results.horizon_impacts
            ],
            regional_impacts=[
                RegionalImpactDTO(
                    area=r.area,
                    year=r.year,
                    gdp_real_pct=r.gdp_real_pct,
                    employment_jobs=r.employment_jobs,
                    income_tax_eur_m=r.income_tax_eur_m,
                    social_spending_eur_m=r.social_spending_eur_m,
                    direction=r.direction,
                )
                for r in simulation.results.regional_impacts
            ],
            investment_impacts=[
                InvestmentImpactDTO(
                    year=i.year,
                    public_investment_eur_m=i.public_investment_eur_m,
                    private_investment_eur_m=i.private_investment_eur_m,
                    fdi_investment_eur_m=i.fdi_investment_eur_m,
                    total_investment_eur_m=i.total_investment_eur_m,
                    direction=i.direction,
                    explanation=i.explanation,
                )
                for i in simulation.results.investment_impacts
            ],
            model_name=simulation.results.model_name,
            model_version=simulation.results.model_version,
            confidence=simulation.results.confidence.value,
            assumptions=simulation.results.assumptions,
            caveats=simulation.results.caveats,
            causal_chain=simulation.results.causal_chain,
            key_drivers=simulation.results.key_drivers,
            winners=simulation.results.winners,
            losers=simulation.results.losers,
        )

    return SimulationDetailsDTO(
        run_id=simulation.id,
        status=simulation.status.value,
        created_at=simulation.created_at,
        started_at=simulation.started_at,
        completed_at=simulation.completed_at,
        policy_text=simulation.parameters.policy_text if simulation.parameters else "",
        results=results_dto,
        error_message=simulation.error_message,
    )


@router.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
