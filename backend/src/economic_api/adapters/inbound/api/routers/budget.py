"""Budget data API router backed by Latvia Open Data Portal."""

from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from .....adapters.outbound.external.budget_open_data import BudgetOpenDataClient
from .....application.dto import (
    BudgetRevenueSourceDetailDTO,
    BudgetRevenueSourceDTO,
    BudgetRevenueSourcesHistoryResponseDTO,
    BudgetVoteDivisionDTO,
    BudgetVoteDivisionGroupSummaryDTO,
    BudgetVoteDivisionHistoryPointDTO,
    BudgetVoteDivisionHistoryResponseDTO,
    BudgetVoteDivisionsResponseDTO,
    EconomyExportGroupDTO,
    EconomyStructureResponseDTO,
    TradeOverviewResponseDTO,
    TradePartnerValueDTO,
)
from ..dependencies import get_budget_open_data_client

router = APIRouter(prefix="/api", tags=["budget"])
logger = logging.getLogger(__name__)


@router.get("/budget/vote-divisions", response_model=BudgetVoteDivisionsResponseDTO)
async def get_budget_vote_divisions(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    limit: int = Query(default=12, ge=1, le=200),
) -> BudgetVoteDivisionsResponseDTO:
    """Return ministry/resor expenditure shares for the selected or latest period."""
    if month is not None and year is None:
        raise HTTPException(status_code=400, detail="When 'month' is provided, 'year' is required.")

    try:
        snapshot = client.get_vote_divisions(year=year, month=month, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading budget vote divisions year=%s month=%s", year, month)
        raise HTTPException(
            status_code=503,
            detail=f"Budget open data source unavailable: {type(exc).__name__}",
        ) from exc

    return BudgetVoteDivisionsResponseDTO(
        year=snapshot.year,
        month=snapshot.month,
        month_name=snapshot.month_name,
        total_expenditure_eur_m=snapshot.total_expenditure_eur_m,
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_id=snapshot.source_resource_id,
        source_last_modified=snapshot.source_last_modified,
        source_url=snapshot.source_url,
        divisions=[
            BudgetVoteDivisionDTO(
                id=item.id,
                label=item.label,
                vote_division=item.vote_division,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
                cents_from_euro=item.cents_from_euro,
            )
            for item in snapshot.divisions
        ],
    )


@router.get("/budget/vote-divisions/history", response_model=BudgetVoteDivisionHistoryResponseDTO)
async def get_budget_vote_division_history(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100),
    group: Optional[str] = Query(default=None),
    top_groups: int = Query(default=12, ge=5, le=30),
) -> BudgetVoteDivisionHistoryResponseDTO:
    """Return yearly changes for one expenditure group since selected base year."""
    try:
        snapshot = client.get_vote_division_history(
            since_year=since_year,
            group=group,
            top_groups=top_groups,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading budget vote division history since_year=%s group=%s", since_year, group)
        raise HTTPException(
            status_code=503,
            detail=f"Budget history source unavailable: {type(exc).__name__}",
        ) from exc

    return BudgetVoteDivisionHistoryResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_group_id=snapshot.selected_group_id,
        selected_group_label=snapshot.selected_group_label,
        total_expenditure_latest_eur_m=snapshot.total_expenditure_latest_eur_m,
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_ids=snapshot.source_resource_ids,
        groups=[
            BudgetVoteDivisionGroupSummaryDTO(
                id=item.id,
                label=item.label,
                latest_amount_eur_m=item.latest_amount_eur_m,
                latest_share_pct=item.latest_share_pct,
            )
            for item in snapshot.groups
        ],
        series=[
            BudgetVoteDivisionHistoryPointDTO(
                year=item.year,
                month=item.month,
                month_name=item.month_name,
                amount_eur_m=item.amount_eur_m,
                change_from_base_eur_m=item.change_from_base_eur_m,
                change_from_base_pct=item.change_from_base_pct,
                change_yoy_eur_m=item.change_yoy_eur_m,
                change_yoy_pct=item.change_yoy_pct,
            )
            for item in snapshot.series
        ],
    )


@router.get("/budget/revenue-sources/history", response_model=BudgetRevenueSourcesHistoryResponseDTO)
async def get_budget_revenue_sources_history(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100),
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
) -> BudgetRevenueSourcesHistoryResponseDTO:
    """Return revenue source buckets with YoY changes for selected year."""
    try:
        snapshot = client.get_revenue_sources_history(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading budget revenue source history since_year=%s year=%s", since_year, year)
        raise HTTPException(
            status_code=503,
            detail=f"Budget revenue history source unavailable: {type(exc).__name__}",
        ) from exc

    return BudgetRevenueSourcesHistoryResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_year=snapshot.selected_year,
        selected_month=snapshot.selected_month,
        selected_month_name=snapshot.selected_month_name,
        total_revenue_eur_m=snapshot.total_revenue_eur_m,
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_ids=snapshot.source_resource_ids,
        available_years=snapshot.available_years,
        categories=[
            BudgetRevenueSourceDTO(
                id=item.id,
                label=item.label,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
                change_yoy_eur_m=item.change_yoy_eur_m,
                change_yoy_pct=item.change_yoy_pct,
                details=[
                    BudgetRevenueSourceDetailDTO(
                        label=detail.label,
                        amount_eur_m=detail.amount_eur_m,
                        share_of_category_pct=detail.share_of_category_pct,
                    )
                    for detail in item.details
                ],
            )
            for item in snapshot.categories
        ],
    )


@router.get("/budget/trade/overview", response_model=TradeOverviewResponseDTO)
async def get_budget_trade_overview(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100),
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    top_partners: int = Query(default=15, ge=5, le=50),
) -> TradeOverviewResponseDTO:
    """Return trade balance and top partner-country values."""
    try:
        snapshot = client.get_trade_overview(since_year=since_year, year=year, top_partners=top_partners)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading trade overview since_year=%s year=%s", since_year, year)
        raise HTTPException(
            status_code=503,
            detail=f"Trade data source unavailable: {type(exc).__name__}",
        ) from exc

    return TradeOverviewResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_year=snapshot.selected_year,
        total_exports_eur_m=snapshot.total_exports_eur_m,
        total_imports_eur_m=snapshot.total_imports_eur_m,
        trade_balance_eur_m=snapshot.trade_balance_eur_m,
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_id=snapshot.source_resource_id,
        country_map_resource_id=snapshot.country_map_resource_id,
        available_years=snapshot.available_years,
        partners=[
            TradePartnerValueDTO(
                country_code=item.country_code,
                country_name_lv=item.country_name_lv,
                country_name_en=item.country_name_en,
                exports_eur_m=item.exports_eur_m,
                imports_eur_m=item.imports_eur_m,
                balance_eur_m=item.balance_eur_m,
                total_trade_eur_m=item.total_trade_eur_m,
                share_of_total_trade_pct=item.share_of_total_trade_pct,
            )
            for item in snapshot.partners
        ],
    )


@router.get("/budget/economy-structure", response_model=EconomyStructureResponseDTO)
async def get_budget_economy_structure(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100),
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
) -> EconomyStructureResponseDTO:
    """Return economy split, export composition, and remittance metrics."""
    try:
        snapshot = client.get_economy_structure(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading economy structure since_year=%s year=%s", since_year, year)
        raise HTTPException(
            status_code=503,
            detail=f"Economy structure source unavailable: {type(exc).__name__}",
        ) from exc

    return EconomyStructureResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_year=snapshot.selected_year,
        available_years=snapshot.available_years,
        production_share_pct=snapshot.production_share_pct,
        services_share_pct=snapshot.services_share_pct,
        agriculture_share_pct=snapshot.agriculture_share_pct,
        industry_share_pct=snapshot.industry_share_pct,
        manufacturing_exports_share_pct=snapshot.manufacturing_exports_share_pct,
        ict_services_exports_share_pct=snapshot.ict_services_exports_share_pct,
        remittances_usd_m=snapshot.remittances_usd_m,
        remittances_share_gdp_pct=snapshot.remittances_share_gdp_pct,
        total_exports_eur_m=snapshot.total_exports_eur_m,
        export_groups=[
            EconomyExportGroupDTO(
                id=item.id,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
            )
            for item in snapshot.export_groups
        ],
        source_trade_dataset_id=snapshot.source_trade_dataset_id,
        source_trade_resource_id=snapshot.source_trade_resource_id,
        source_world_bank_country=snapshot.source_world_bank_country,
    )
