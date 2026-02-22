"""Budget data API router backed by Latvia Open Data Portal."""

from __future__ import annotations

import logging
from typing import Annotated, Literal, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query

from .....adapters.outbound.external.budget_open_data import BudgetOpenDataClient
from .....application.dto import (
    BudgetExpenditurePositionDTO,
    BudgetExpenditurePositionsResponseDTO,
    BudgetProcurementEntityDTO,
    BudgetProcurementKpiResponseDTO,
    BudgetRevenueSourceDetailDTO,
    BudgetRevenueSourceDTO,
    BudgetRevenueSourcesHistoryResponseDTO,
    BudgetVoteDivisionDTO,
    BudgetVoteDivisionGroupSummaryDTO,
    BudgetVoteDivisionHistoryPointDTO,
    BudgetVoteDivisionHistoryResponseDTO,
    BudgetVoteDivisionsResponseDTO,
    ConstructionOverviewPointDTO,
    ConstructionOverviewResponseDTO,
    EconomyExportGroupDTO,
    EconomyStructureResponseDTO,
    ErrorResponseDTO,
    ExternalDebtOverviewPointDTO,
    ExternalDebtOverviewResponseDTO,
    TradeOverviewResponseDTO,
    TradePartnerValueDTO,
)
from ..dependencies import get_budget_open_data_client

router = APIRouter(prefix="/api", tags=["budget"])
logger = logging.getLogger(__name__)

BUDGET_COMMON_RESPONSES = {
    400: {"model": ErrorResponseDTO, "description": "Invalid request parameters."},
    422: {"model": ErrorResponseDTO, "description": "Request validation failed."},
    503: {"model": ErrorResponseDTO, "description": "Upstream data source unavailable."},
}
_GROUP_BY_OPTIONS = ("ekk", "program", "institution", "ministry")


def _require_year_when_month(*, year: Optional[int], month: Optional[int]) -> None:
    if month is not None and year is None:
        raise HTTPException(status_code=400, detail="When 'month' is provided, 'year' is required.")


def _service_unavailable(detail_prefix: str) -> HTTPException:
    return HTTPException(status_code=503, detail=f"{detail_prefix} source unavailable.")


@router.get(
    "/budget/vote-divisions",
    response_model=BudgetVoteDivisionsResponseDTO,
    summary="Get Vote Divisions",
    description="Return ministry/resor expenditure shares for the selected period (or latest available).",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_vote_divisions(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Calendar year to load (YYYY)."),
    month: Optional[int] = Query(default=None, ge=1, le=12, description="Calendar month (1-12); requires year."),
    limit: int = Query(default=12, ge=1, le=200, description="Maximum number of divisions to return."),
) -> BudgetVoteDivisionsResponseDTO:
    """Return ministry/resor expenditure shares for the selected or latest period."""
    _require_year_when_month(year=year, month=month)

    try:
        snapshot = client.get_vote_divisions(year=year, month=month, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading budget vote divisions year=%s month=%s", year, month)
        raise _service_unavailable("Budget open data") from exc

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


@router.get(
    "/budget/vote-divisions/history",
    response_model=BudgetVoteDivisionHistoryResponseDTO,
    summary="Get Vote Division History",
    description="Return yearly changes for one expenditure group from a selected base year.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_vote_division_history(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    group: Optional[str] = Query(default=None, description="Optional group ID/label to select."),
    top_groups: int = Query(default=12, ge=5, le=30, description="Number of top groups to expose in selector."),
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
        raise _service_unavailable("Budget history") from exc

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


@router.get(
    "/budget/revenue-sources/history",
    response_model=BudgetRevenueSourcesHistoryResponseDTO,
    summary="Get Revenue Sources History",
    description="Return revenue source buckets and YoY changes for a selected year.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_revenue_sources_history(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Optional target year (latest if omitted)."),
) -> BudgetRevenueSourcesHistoryResponseDTO:
    """Return revenue source buckets with YoY changes for selected year."""
    try:
        snapshot = client.get_revenue_sources_history(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading budget revenue source history since_year=%s year=%s", since_year, year)
        raise _service_unavailable("Budget revenue history") from exc

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


@router.get(
    "/budget/trade/overview",
    response_model=TradeOverviewResponseDTO,
    summary="Get Trade Overview",
    description="Return exports, imports, balance, and top partner-country values.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_trade_overview(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Optional target year (latest if omitted)."),
    top_partners: int = Query(default=15, ge=5, le=50, description="Maximum number of partner countries."),
) -> TradeOverviewResponseDTO:
    """Return trade balance and top partner-country values."""
    try:
        snapshot = client.get_trade_overview(since_year=since_year, year=year, top_partners=top_partners)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading trade overview since_year=%s year=%s", since_year, year)
        raise _service_unavailable("Trade data") from exc

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


@router.get(
    "/budget/economy-structure",
    response_model=EconomyStructureResponseDTO,
    summary="Get Economy Structure",
    description="Return services/production split, export composition, and remittance metrics.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_economy_structure(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Optional target year (latest if omitted)."),
) -> EconomyStructureResponseDTO:
    """Return economy split, export composition, and remittance metrics."""
    try:
        snapshot = client.get_economy_structure(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading economy structure since_year=%s year=%s", since_year, year)
        raise _service_unavailable("Economy structure") from exc

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


@router.get(
    "/budget/debt-overview",
    response_model=ExternalDebtOverviewResponseDTO,
    summary="Get Debt Overview",
    description="Return debt burden, servicing costs, interest costs, and yearly trend.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_debt_overview(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Optional target year (latest if omitted)."),
) -> ExternalDebtOverviewResponseDTO:
    """Return external debt burden and debt-service costs for selected year."""
    try:
        snapshot = client.get_external_debt_overview(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading debt overview since_year=%s year=%s", since_year, year)
        raise _service_unavailable("Debt overview") from exc

    return ExternalDebtOverviewResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_year=snapshot.selected_year,
        available_years=snapshot.available_years,
        external_debt_usd_m=snapshot.external_debt_usd_m,
        external_debt_eur_m=snapshot.external_debt_eur_m,
        external_debt_per_capita_usd=snapshot.external_debt_per_capita_usd,
        external_debt_per_capita_eur=snapshot.external_debt_per_capita_eur,
        external_debt_pct_gdp=snapshot.external_debt_pct_gdp,
        debt_service_usd_m=snapshot.debt_service_usd_m,
        debt_service_eur_m=snapshot.debt_service_eur_m,
        debt_service_pct_exports=snapshot.debt_service_pct_exports,
        interest_payments_usd_m=snapshot.interest_payments_usd_m,
        interest_payments_eur_m=snapshot.interest_payments_eur_m,
        population_m=snapshot.population_m,
        debt_basis=snapshot.debt_basis,
        source_world_bank_country=snapshot.source_world_bank_country,
        source_indicators=snapshot.source_indicators,
        notes=snapshot.notes,
        series=[
            ExternalDebtOverviewPointDTO(
                year=item.year,
                external_debt_usd_m=item.external_debt_usd_m,
                debt_service_usd_m=item.debt_service_usd_m,
                external_debt_pct_gdp=item.external_debt_pct_gdp,
            )
            for item in snapshot.series
        ],
    )


@router.get(
    "/budget/construction-overview",
    response_model=ConstructionOverviewResponseDTO,
    summary="Get Construction Overview",
    description="Return construction and investment metrics including private/public proxy split by year.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_construction_overview(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    since_year: int = Query(default=2010, ge=2000, le=2100, description="Inclusive starting year."),
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Optional target year (latest if omitted)."),
) -> ConstructionOverviewResponseDTO:
    """Return construction value-added and private/public investment split by year."""
    try:
        snapshot = client.get_construction_overview(since_year=since_year, year=year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading construction overview since_year=%s year=%s", since_year, year)
        raise _service_unavailable("Construction overview") from exc

    return ConstructionOverviewResponseDTO(
        since_year=snapshot.since_year,
        to_year=snapshot.to_year,
        selected_year=snapshot.selected_year,
        available_years=snapshot.available_years,
        construction_value_added_eur_m=snapshot.construction_value_added_eur_m,
        construction_share_gdp_pct=snapshot.construction_share_gdp_pct,
        total_fixed_investment_eur_m=snapshot.total_fixed_investment_eur_m,
        private_fixed_investment_eur_m=snapshot.private_fixed_investment_eur_m,
        public_soe_proxy_investment_eur_m=snapshot.public_soe_proxy_investment_eur_m,
        private_share_pct=snapshot.private_share_pct,
        public_soe_proxy_share_pct=snapshot.public_soe_proxy_share_pct,
        source_world_bank_country=snapshot.source_world_bank_country,
        source_indicators=snapshot.source_indicators,
        notes=snapshot.notes,
        series=[
            ConstructionOverviewPointDTO(
                year=item.year,
                construction_value_added_eur_m=item.construction_value_added_eur_m,
                construction_share_gdp_pct=item.construction_share_gdp_pct,
                total_fixed_investment_eur_m=item.total_fixed_investment_eur_m,
                private_fixed_investment_eur_m=item.private_fixed_investment_eur_m,
                public_soe_proxy_investment_eur_m=item.public_soe_proxy_investment_eur_m,
                private_share_pct=item.private_share_pct,
                public_soe_proxy_share_pct=item.public_soe_proxy_share_pct,
            )
            for item in snapshot.series
        ],
    )


@router.get(
    "/budget/expenditure-positions",
    response_model=BudgetExpenditurePositionsResponseDTO,
    summary="Get Expenditure Positions",
    description="Return top expenditure positions by EKK/program/institution/ministry for the selected period.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_expenditure_positions(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Calendar year to load (YYYY)."),
    month: Optional[int] = Query(default=None, ge=1, le=12, description="Calendar month (1-12); requires year."),
    group_by: str = Query(
        default="ekk",
        description="Grouping key: ekk, program, institution, or ministry.",
    ),
    limit: int = Query(default=12, ge=5, le=50, description="Maximum number of position rows to return."),
) -> BudgetExpenditurePositionsResponseDTO:
    """Return top expenditure positions (EKK/program/institution/ministry)."""
    _require_year_when_month(year=year, month=month)
    group_by_normalized = group_by.strip().lower()
    if group_by_normalized not in _GROUP_BY_OPTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"group_by must be one of: {', '.join(_GROUP_BY_OPTIONS)}",
        )
    try:
        snapshot = client.get_expenditure_positions(
            year=year,
            month=month,
            group_by=cast(Literal["ekk", "program", "institution", "ministry"], group_by_normalized),
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Failed loading expenditure positions year=%s month=%s group_by=%s",
            year,
            month,
            group_by_normalized,
        )
        raise _service_unavailable("Expenditure positions") from exc

    return BudgetExpenditurePositionsResponseDTO(
        year=snapshot.year,
        month=snapshot.month,
        month_name=snapshot.month_name,
        available_years=snapshot.available_years,
        group_by=snapshot.group_by,
        group_label=snapshot.group_label,
        total_expenditure_eur_m=snapshot.total_expenditure_eur_m,
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_id=snapshot.source_resource_id,
        source_last_modified=snapshot.source_last_modified,
        source_url=snapshot.source_url,
        positions=[
            BudgetExpenditurePositionDTO(
                id=item.id,
                label=item.label,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
            )
            for item in snapshot.positions
        ],
    )


@router.get(
    "/budget/procurement-kpi",
    response_model=BudgetProcurementKpiResponseDTO,
    summary="Get Procurement KPI",
    description="Return procurement-oriented KPI payload derived from budget execution data.",
    responses=BUDGET_COMMON_RESPONSES,
)
async def get_budget_procurement_kpi(
    client: Annotated[BudgetOpenDataClient, Depends(get_budget_open_data_client)],
    year: Optional[int] = Query(default=None, ge=2000, le=2100, description="Calendar year to load (YYYY)."),
    month: Optional[int] = Query(default=None, ge=1, le=12, description="Calendar month (1-12); requires year."),
    top_n: int = Query(default=10, ge=5, le=30, description="Maximum number of top purchasers/suppliers."),
) -> BudgetProcurementKpiResponseDTO:
    """Return procurement optimization KPI card payload from budget execution data."""
    _require_year_when_month(year=year, month=month)
    try:
        snapshot = client.get_procurement_kpis(year=year, month=month, top_n=top_n)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed loading procurement KPI year=%s month=%s", year, month)
        raise _service_unavailable("Procurement KPI") from exc

    return BudgetProcurementKpiResponseDTO(
        year=snapshot.year,
        month=snapshot.month,
        month_name=snapshot.month_name,
        available_years=snapshot.available_years,
        total_expenditure_eur_m=snapshot.total_expenditure_eur_m,
        procurement_like_expenditure_eur_m=snapshot.procurement_like_expenditure_eur_m,
        procurement_like_share_pct=snapshot.procurement_like_share_pct,
        single_bid_share_pct=snapshot.single_bid_share_pct,
        avg_bidder_count=snapshot.avg_bidder_count,
        initial_vs_actual_contract_delta_pct=snapshot.initial_vs_actual_contract_delta_pct,
        top_purchasers=[
            BudgetProcurementEntityDTO(
                id=item.id,
                label=item.label,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
            )
            for item in snapshot.top_purchasers
        ],
        top_suppliers=[
            BudgetProcurementEntityDTO(
                id=item.id,
                label=item.label,
                amount_eur_m=item.amount_eur_m,
                share_pct=item.share_pct,
            )
            for item in snapshot.top_suppliers
        ],
        source_dataset_id=snapshot.source_dataset_id,
        source_resource_id=snapshot.source_resource_id,
        source_last_modified=snapshot.source_last_modified,
        source_url=snapshot.source_url,
        notes=snapshot.notes,
    )
