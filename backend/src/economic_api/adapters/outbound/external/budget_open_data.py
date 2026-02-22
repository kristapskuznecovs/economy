"""Client for Latvia Open Data Portal budget execution table."""

from __future__ import annotations

import logging
import os
import re
import threading
import unicodedata
from dataclasses import dataclass
from time import time
from typing import Any, Literal, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BudgetVoteDivision:
    """One expenditure division row normalized for UI/API usage."""

    id: str
    label: str
    vote_division: str
    amount_eur_m: float
    share_pct: float
    cents_from_euro: float


@dataclass(frozen=True)
class BudgetVoteDivisionSnapshot:
    """Aggregated snapshot for a selected budget period."""

    year: int
    month: int
    month_name: str
    total_expenditure_eur_m: float
    source_dataset_id: str
    source_resource_id: str
    source_last_modified: Optional[str]
    source_url: Optional[str]
    divisions: list[BudgetVoteDivision]


@dataclass(frozen=True)
class BudgetVoteDivisionGroupSummary:
    """Group metadata for history explorer."""

    id: str
    label: str
    latest_amount_eur_m: float
    latest_share_pct: float


@dataclass(frozen=True)
class BudgetVoteDivisionHistoryPoint:
    """One yearly history point for selected expenditure group."""

    year: int
    month: int
    month_name: str
    amount_eur_m: float
    change_from_base_eur_m: float
    change_from_base_pct: Optional[float]
    change_yoy_eur_m: Optional[float]
    change_yoy_pct: Optional[float]


@dataclass(frozen=True)
class BudgetVoteDivisionHistorySnapshot:
    """History response payload for selected group."""

    since_year: int
    to_year: int
    selected_group_id: str
    selected_group_label: str
    total_expenditure_latest_eur_m: float
    source_dataset_id: str
    source_resource_ids: list[str]
    groups: list[BudgetVoteDivisionGroupSummary]
    series: list[BudgetVoteDivisionHistoryPoint]


@dataclass(frozen=True)
class BudgetRevenueSource:
    """One normalized revenue source bucket for selected year."""

    id: str
    label: str
    amount_eur_m: float
    share_pct: float
    change_yoy_eur_m: Optional[float]
    change_yoy_pct: Optional[float]
    details: list["BudgetRevenueSourceDetail"]


@dataclass(frozen=True)
class BudgetRevenueSourceDetail:
    """One detailed line item inside a revenue source category."""

    label: str
    amount_eur_m: float
    share_of_category_pct: float


@dataclass(frozen=True)
class BudgetRevenueSourcesHistorySnapshot:
    """Revenue source distribution for one selected year, with YoY deltas."""

    since_year: int
    to_year: int
    selected_year: int
    selected_month: int
    selected_month_name: str
    total_revenue_eur_m: float
    source_dataset_id: str
    source_resource_ids: list[str]
    categories: list[BudgetRevenueSource]
    available_years: list[int]


@dataclass(frozen=True)
class TradePartnerValue:
    """Trade values for one partner country in selected year."""

    country_code: str
    country_name_lv: str
    country_name_en: str
    exports_eur_m: float
    imports_eur_m: float
    balance_eur_m: float
    total_trade_eur_m: float
    share_of_total_trade_pct: float


@dataclass(frozen=True)
class TradeOverviewSnapshot:
    """Trade summary and partner breakdown for one selected year."""

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
    partners: list[TradePartnerValue]


@dataclass(frozen=True)
class EconomyExportGroup:
    """One export composition group for selected year."""

    id: str
    amount_eur_m: float
    share_pct: float


@dataclass(frozen=True)
class EconomyStructureSnapshot:
    """Economy split + exports + remittances for selected year."""

    since_year: int
    to_year: int
    selected_year: int
    available_years: list[int]
    production_share_pct: Optional[float]
    services_share_pct: Optional[float]
    agriculture_share_pct: Optional[float]
    industry_share_pct: Optional[float]
    manufacturing_exports_share_pct: Optional[float]
    ict_services_exports_share_pct: Optional[float]
    remittances_usd_m: Optional[float]
    remittances_share_gdp_pct: Optional[float]
    total_exports_eur_m: float
    export_groups: list[EconomyExportGroup]
    source_trade_dataset_id: str
    source_trade_resource_id: str
    source_world_bank_country: str


@dataclass(frozen=True)
class BudgetExpenditurePosition:
    """One expenditure position row for EKK/program/institution view."""

    id: str
    label: str
    amount_eur_m: float
    share_pct: float


@dataclass(frozen=True)
class BudgetExpenditurePositionsSnapshot:
    """Top expenditure positions for selected period and grouping."""

    year: int
    month: int
    month_name: str
    available_years: list[int]
    group_by: Literal["ekk", "program", "institution", "ministry"]
    group_label: str
    total_expenditure_eur_m: float
    source_dataset_id: str
    source_resource_id: str
    source_last_modified: Optional[str]
    source_url: Optional[str]
    positions: list[BudgetExpenditurePosition]


@dataclass(frozen=True)
class BudgetProcurementEntity:
    """One purchaser/supplier aggregation row inside procurement KPI payload."""

    id: str
    label: str
    amount_eur_m: float
    share_pct: float


@dataclass(frozen=True)
class BudgetProcurementKpiSnapshot:
    """Procurement-related KPI payload derived from available budget rows."""

    year: int
    month: int
    month_name: str
    available_years: list[int]
    total_expenditure_eur_m: float
    procurement_like_expenditure_eur_m: float
    procurement_like_share_pct: float
    single_bid_share_pct: Optional[float]
    avg_bidder_count: Optional[float]
    initial_vs_actual_contract_delta_pct: Optional[float]
    top_purchasers: list[BudgetProcurementEntity]
    top_suppliers: list[BudgetProcurementEntity]
    source_dataset_id: str
    source_resource_id: str
    source_last_modified: Optional[str]
    source_url: Optional[str]
    notes: list[str]


@dataclass(frozen=True)
class ExternalDebtOverviewPoint:
    """One yearly point for external debt overview trend."""

    year: int
    external_debt_usd_m: Optional[float]
    debt_service_usd_m: Optional[float]
    external_debt_pct_gdp: Optional[float]


@dataclass(frozen=True)
class ExternalDebtOverviewSnapshot:
    """External debt summary for selected year plus trend series."""

    since_year: int
    to_year: int
    selected_year: int
    available_years: list[int]
    external_debt_usd_m: Optional[float]
    external_debt_eur_m: Optional[float]
    external_debt_per_capita_usd: Optional[float]
    external_debt_per_capita_eur: Optional[float]
    external_debt_pct_gdp: Optional[float]
    debt_service_usd_m: Optional[float]
    debt_service_eur_m: Optional[float]
    debt_service_pct_exports: Optional[float]
    interest_payments_usd_m: Optional[float]
    interest_payments_eur_m: Optional[float]
    population_m: Optional[float]
    debt_basis: str
    source_world_bank_country: str
    source_indicators: list[str]
    notes: list[str]
    series: list[ExternalDebtOverviewPoint]


@dataclass(frozen=True)
class ConstructionOverviewPoint:
    """One yearly point for construction/investment overview trend."""

    year: int
    construction_value_added_eur_m: Optional[float]
    construction_share_gdp_pct: Optional[float]
    total_fixed_investment_eur_m: Optional[float]
    private_fixed_investment_eur_m: Optional[float]
    public_soe_proxy_investment_eur_m: Optional[float]
    private_share_pct: Optional[float]
    public_soe_proxy_share_pct: Optional[float]


@dataclass(frozen=True)
class ConstructionOverviewSnapshot:
    """Construction and investment split for selected year plus trend series."""

    since_year: int
    to_year: int
    selected_year: int
    available_years: list[int]
    construction_value_added_eur_m: Optional[float]
    construction_share_gdp_pct: Optional[float]
    total_fixed_investment_eur_m: Optional[float]
    private_fixed_investment_eur_m: Optional[float]
    public_soe_proxy_investment_eur_m: Optional[float]
    private_share_pct: Optional[float]
    public_soe_proxy_share_pct: Optional[float]
    source_world_bank_country: str
    source_indicators: list[str]
    notes: list[str]
    series: list[ConstructionOverviewPoint]


REVENUE_SOURCE_DEFINITIONS: tuple[tuple[str, str], ...] = (
    ("iin", "Iedzīvotāju ienākuma nodoklis (IIN)"),
    ("pvn", "Pievienotās vērtības nodoklis (PVN)"),
    ("akcizes", "Akcīzes nodokļi"),
    ("uzn_ien", "Uzņēmumu ienākuma nodoklis"),
    ("soc_apdr", "Sociālās apdrošināšanas iemaksas"),
    ("nekust_ipas", "Nekustamā īpašuma nodoklis"),
    ("customs", "Muitas nodokļi"),
    ("dab_resursi", "Dabas resursu nodokļi"),
    ("eu_funds", "ES struktūrfondi"),
    ("borrowing", "Aizņēmumi"),
    ("other_rev", "Citi ieņēmumi"),
)

EXPORT_GROUP_ORDER: tuple[str, ...] = (
    "manufacturing_other",
    "lumber_wood",
    "agriculture_food",
    "other_goods",
)


class BudgetOpenDataClient:
    """Fetches and aggregates budget expenditure data from data.gov.lv CKAN."""

    def __init__(self) -> None:
        self.base_url = os.getenv("BUDGET_CKAN_API_BASE", "https://data.gov.lv/dati/api/3/action")
        self.dataset_id = os.getenv(
            "BUDGET_DATASET_ID", "ec81699b-3f04-4d9e-a305-8f9030c495cb"
        )
        self.resource_id_override = os.getenv("BUDGET_RESOURCE_ID")
        self.revenue_dataset_id = os.getenv(
            "BUDGET_REVENUE_DATASET_ID", "80e304db-bd31-40a5-a381-2e7c5d66af78"
        )
        self.revenue_resource_id_override = os.getenv("BUDGET_REVENUE_RESOURCE_ID")
        self.trade_dataset_id = os.getenv(
            "TRADE_DATASET_ID", "5f6c528c-2c4a-48c8-ad2a-a6cf8d620b2f"
        )
        self.trade_resource_id_override = os.getenv("TRADE_RESOURCE_ID")
        self.trade_country_map_resource_id_override = os.getenv("TRADE_COUNTRY_MAP_RESOURCE_ID")
        self.world_bank_country_code = os.getenv("WORLD_BANK_COUNTRY_CODE", "LVA")
        self.world_bank_base_url = os.getenv("WORLD_BANK_API_BASE", "https://api.worldbank.org/v2")
        self.request_timeout_sec = max(
            5.0, min(float(os.getenv("BUDGET_REQUEST_TIMEOUT_SEC", "20")), 120.0)
        )
        self.cache_ttl_sec = max(60, min(int(os.getenv("BUDGET_CACHE_TTL_SEC", "21600")), 86400))
        self.default_limit = max(5, min(int(os.getenv("BUDGET_DIVISIONS_DEFAULT_LIMIT", "12")), 200))

        self._http = httpx.Client(timeout=self.request_timeout_sec)
        self._cache: dict[tuple[Optional[int], Optional[int], int], tuple[float, BudgetVoteDivisionSnapshot]] = {}
        self._history_cache: dict[
            tuple[int, Optional[str], int], tuple[float, BudgetVoteDivisionHistorySnapshot]
        ] = {}
        self._revenue_history_cache: dict[
            tuple[int, Optional[int]], tuple[float, BudgetRevenueSourcesHistorySnapshot]
        ] = {}
        self._trade_overview_cache: dict[
            tuple[int, Optional[int], int], tuple[float, TradeOverviewSnapshot]
        ] = {}
        self._economy_structure_cache: dict[
            tuple[int, Optional[int]], tuple[float, EconomyStructureSnapshot]
        ] = {}
        self._expenditure_positions_cache: dict[
            tuple[Optional[int], Optional[int], str, int], tuple[float, BudgetExpenditurePositionsSnapshot]
        ] = {}
        self._procurement_kpi_cache: dict[
            tuple[Optional[int], Optional[int], int], tuple[float, BudgetProcurementKpiSnapshot]
        ] = {}
        self._external_debt_overview_cache: dict[
            tuple[int, Optional[int]], tuple[float, ExternalDebtOverviewSnapshot]
        ] = {}
        self._construction_overview_cache: dict[
            tuple[int, Optional[int]], tuple[float, ConstructionOverviewSnapshot]
        ] = {}
        self._resource_fields_cache: dict[str, tuple[float, set[str]]] = {}
        self._resource_years_cache: dict[str, tuple[float, list[int]]] = {}
        self._cache_lock = threading.Lock()

    def get_vote_divisions(
        self, year: Optional[int] = None, month: Optional[int] = None, limit: Optional[int] = None
    ) -> BudgetVoteDivisionSnapshot:
        """Return expenditure distribution by vote division (ministry) for one period."""
        if month is not None and year is None:
            raise ValueError("When 'month' is provided, 'year' must also be provided.")

        safe_limit = self.default_limit if limit is None else max(3, min(limit, 200))
        cache_key = (year, month, safe_limit)
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        source_resource = self._resolve_source_resource()
        selected_year, selected_month, month_name = self._resolve_period(
            source_resource["id"], year=year, month=month
        )

        rows = self._query_divisions(
            resource_id=source_resource["id"],
            year=selected_year,
            month=selected_month,
        )
        total = round(sum(amount for _, amount in rows), 2)

        if total <= 0:
            raise RuntimeError("Budget data returned zero total expenditure for selected period.")

        divisions = self._normalize_rows(rows, total, limit=safe_limit)
        top_sum = sum(item.amount_eur_m for item in divisions)
        remainder = round(total - top_sum, 2)
        if remainder > 0.01:
            share = round((remainder / total) * 100, 2)
            divisions.append(
                BudgetVoteDivision(
                    id="other_divisions",
                    label="Pārējie resori un institūcijas",
                    vote_division="Citi",
                    amount_eur_m=remainder,
                    share_pct=share,
                    cents_from_euro=share,
                )
            )

        snapshot = BudgetVoteDivisionSnapshot(
            year=selected_year,
            month=selected_month,
            month_name=month_name,
            total_expenditure_eur_m=round(total, 2),
            source_dataset_id=self.dataset_id,
            source_resource_id=source_resource["id"],
            source_last_modified=source_resource.get("last_modified"),
            source_url=source_resource.get("url"),
            divisions=divisions,
        )
        self._cache_set(cache_key, snapshot)
        return snapshot

    def get_vote_division_history(
        self,
        since_year: int = 2010,
        group: Optional[str] = None,
        top_groups: int = 12,
    ) -> BudgetVoteDivisionHistorySnapshot:
        """Return yearly history for one expenditure group, plus available groups list."""
        safe_since = max(2000, min(since_year, 2100))
        safe_top = max(5, min(top_groups, 30))
        group_key = (group or "").strip().lower() or None
        cache_key = (safe_since, group_key, safe_top)
        cached = self._history_cache_get(cache_key)
        if cached is not None:
            return cached

        # Use single resource for all years
        source_resource = self._resolve_source_resource()

        # Fetch all historical data at once
        yearly_group_amounts, yearly_month = self._fetch_all_years_data(
            resource_id=source_resource["id"],
            since_year=safe_since
        )

        yearly_totals: dict[int, float] = {
            year: round(sum(group_amounts.values()), 2)
            for year, group_amounts in yearly_group_amounts.items()
        }
        source_resource_ids: list[str] = [source_resource["id"]]

        if not yearly_group_amounts:
            raise RuntimeError("No yearly expenditure data available for history.")

        latest_year = max(yearly_group_amounts.keys())
        latest_groups = yearly_group_amounts[latest_year]
        if not latest_groups:
            raise RuntimeError("Latest period has no expenditure groups for history.")

        groups_sorted = sorted(latest_groups.items(), key=lambda item: item[1], reverse=True)
        groups_top = groups_sorted[:safe_top]
        latest_total = yearly_totals[latest_year] or 1.0
        available_groups = [
            BudgetVoteDivisionGroupSummary(
                id=self._slugify(label),
                label=label,
                latest_amount_eur_m=round(amount, 2),
                latest_share_pct=round((amount / latest_total) * 100, 2),
            )
            for label, amount in groups_top
        ]
        if not available_groups:
            raise RuntimeError("No expenditure groups found for history explorer.")

        selected_group_label = self._resolve_selected_group_label(group, available_groups)
        selected_group_id = self._slugify(selected_group_label)

        years_sorted = sorted(yearly_group_amounts.keys())
        base_year = years_sorted[0]
        base_amount = yearly_group_amounts[base_year].get(selected_group_label, 0.0)
        series: list[BudgetVoteDivisionHistoryPoint] = []
        previous_amount: Optional[float] = None

        for year in years_sorted:
            month, month_name = yearly_month[year]

            # Only include years where this ministry exists
            if selected_group_label not in yearly_group_amounts[year]:
                continue

            amount = round(yearly_group_amounts[year][selected_group_label], 2)
            change_from_base = round(amount - base_amount, 2)
            if base_amount > 0:
                change_from_base_pct: Optional[float] = round((change_from_base / base_amount) * 100, 2)
            else:
                change_from_base_pct = None

            if previous_amount is None:
                change_yoy = None
                change_yoy_pct = None
            else:
                diff = round(amount - previous_amount, 2)
                change_yoy = diff
                if previous_amount > 0:
                    change_yoy_pct = round((diff / previous_amount) * 100, 2)
                else:
                    change_yoy_pct = None
            previous_amount = amount

            series.append(
                BudgetVoteDivisionHistoryPoint(
                    year=year,
                    month=month,
                    month_name=month_name,
                    amount_eur_m=amount,
                    change_from_base_eur_m=change_from_base,
                    change_from_base_pct=change_from_base_pct,
                    change_yoy_eur_m=change_yoy,
                    change_yoy_pct=change_yoy_pct,
                )
            )

        snapshot = BudgetVoteDivisionHistorySnapshot(
            since_year=base_year,
            to_year=latest_year,
            selected_group_id=selected_group_id,
            selected_group_label=selected_group_label,
            total_expenditure_latest_eur_m=round(yearly_totals[latest_year], 2),
            source_dataset_id=self.dataset_id,
            source_resource_ids=source_resource_ids,
            groups=available_groups,
            series=series,
        )
        self._history_cache_set(cache_key, snapshot)
        return snapshot

    def get_revenue_sources_history(
        self,
        since_year: int = 2010,
        year: Optional[int] = None,
    ) -> BudgetRevenueSourcesHistorySnapshot:
        """Return revenue source buckets for selected year with YoY changes."""
        safe_since = max(2000, min(since_year, 2100))
        cache_key = (safe_since, year)
        cached = self._revenue_history_cache_get(cache_key)
        if cached is not None:
            return cached

        resources_by_year = self._resolve_resources_by_year_from_urls_for_dataset(
            dataset_id=self.revenue_dataset_id,
            min_year=safe_since,
            resource_id_override=self.revenue_resource_id_override,
        )

        yearly_monthly_category_amounts: dict[int, dict[int, tuple[str, dict[str, float]]]] = {}
        yearly_category_details: dict[int, dict[str, dict[str, float]]] = {}
        source_resource_ids: list[str] = []

        for data_year, resource in sorted(resources_by_year.items()):
            records = self._fetch_records(
                resource_id=resource["id"],
                filters={"Klasifikacija": "Ieņēmumi"},
                fields=[
                    "Gads",
                    "Menesis_Atslega",
                    "Menesis_nosaukums",
                    "Konsolidacija",
                    "Summa",
                    "Likuma_griezuma_EKK",
                    "Vienotais_EKK_Nosaukums_8_limenis",
                    "Projekts_nosaukums",
                    "Vienotais_EKK_Atslega_8_limenis",
                    "Vienotais_EKK_Atslega_7_limenis",
                ],
                page_size=5000,
                max_records=300000,
            )
            monthly_categorized = self._aggregate_revenue_monthly_from_records(records)
            if not monthly_categorized:
                continue
            yearly_monthly_category_amounts[data_year] = monthly_categorized
            yearly_category_details[data_year] = self._aggregate_revenue_category_details_from_records(records)
            source_resource_ids.append(resource["id"])

        if not yearly_monthly_category_amounts:
            raise RuntimeError("No yearly revenue source data available for history.")

        years_sorted = sorted(yearly_monthly_category_amounts.keys())
        selected_year = years_sorted[-1] if year is None else year
        if selected_year not in yearly_monthly_category_amounts:
            raise ValueError(f"No revenue source data found for year {selected_year}.")

        previous_year_candidates = [item for item in years_sorted if item < selected_year]
        previous_year = previous_year_candidates[-1] if previous_year_candidates else None

        selected_year_months = yearly_monthly_category_amounts[selected_year]
        selected_month = max(selected_year_months.keys())
        selected_month_name, _selected_month_map = selected_year_months[selected_month]
        selected_map = self._sum_revenue_category_maps(
            [month_map for _, month_map in selected_year_months.values()]
        )

        previous_map: dict[str, float] = {}
        if previous_year is not None:
            previous_year_months = yearly_monthly_category_amounts.get(previous_year, {})
            if previous_year_months:
                previous_map = self._sum_revenue_category_maps(
                    [month_map for _, month_map in previous_year_months.values()]
                )

        total_revenue = round(sum(selected_map.values()), 2)

        categories: list[BudgetRevenueSource] = []
        selected_details = yearly_category_details.get(selected_year, {})
        for category_id, category_label in REVENUE_SOURCE_DEFINITIONS:
            amount = round(selected_map.get(category_id, 0.0), 2)
            share_pct = round((amount / total_revenue) * 100, 2) if total_revenue > 0 else 0.0

            if previous_year is None:
                change_yoy = None
                change_yoy_pct = None
            else:
                previous_amount = round(previous_map.get(category_id, 0.0), 2)
                change_yoy = round(amount - previous_amount, 2)
                change_yoy_pct = round((change_yoy / previous_amount) * 100, 2) if previous_amount != 0 else None

            raw_detail_items = selected_details.get(category_id, {})
            detail_items_sorted = sorted(raw_detail_items.items(), key=lambda item: item[1], reverse=True)[:8]
            detail_items = [
                BudgetRevenueSourceDetail(
                    label=label,
                    amount_eur_m=round(value, 2),
                    share_of_category_pct=round((value / amount) * 100, 2) if amount > 0 else 0.0,
                )
                for label, value in detail_items_sorted
            ]

            categories.append(
                BudgetRevenueSource(
                    id=category_id,
                    label=category_label,
                    amount_eur_m=amount,
                    share_pct=share_pct,
                    change_yoy_eur_m=change_yoy,
                    change_yoy_pct=change_yoy_pct,
                    details=detail_items,
                )
            )

        snapshot = BudgetRevenueSourcesHistorySnapshot(
            since_year=years_sorted[0],
            to_year=years_sorted[-1],
            selected_year=selected_year,
            selected_month=selected_month,
            selected_month_name=selected_month_name,
            total_revenue_eur_m=total_revenue,
            source_dataset_id=self.revenue_dataset_id,
            source_resource_ids=source_resource_ids,
            categories=categories,
            available_years=years_sorted,
        )
        self._revenue_history_cache_set(cache_key, snapshot)
        return snapshot

    def get_trade_overview(
        self,
        since_year: int = 2010,
        year: Optional[int] = None,
        top_partners: int = 15,
    ) -> TradeOverviewSnapshot:
        """Return trade exports/imports/balance and top partner countries."""
        safe_since = max(2000, min(since_year, 2100))
        safe_top = max(5, min(top_partners, 50))
        cache_key = (safe_since, year, safe_top)
        cached = self._trade_overview_cache_get(cache_key)
        if cached is not None:
            return cached

        values_resource = self._resolve_trade_values_resource()
        available_years = self._resolve_trade_years(resource_id=values_resource["id"], since_year=safe_since)
        if not available_years:
            raise RuntimeError("No trade data years available for selected period.")

        selected_year = available_years[-1] if year is None else year
        if selected_year not in available_years:
            raise ValueError(f"No trade data found for year {selected_year}.")

        rows = self._fetch_records(
            resource_id=values_resource["id"],
            filters={"TIME": selected_year, "CN2Z": "TOTAL"},
            fields=["TIME", "FLOW", "COUNTRY", "Value"],
            page_size=5000,
            max_records=100000,
        )

        if not rows:
            raise RuntimeError(f"No trade records for year {selected_year}.")

        country_map_resource = self._resolve_trade_country_map_resource()
        country_names = self._fetch_trade_country_names(country_map_resource["id"])

        exports_total = 0.0
        imports_total = 0.0
        by_country: dict[str, dict[str, float]] = {}

        for row in rows:
            flow = str(row.get("FLOW", "")).strip()
            country = str(row.get("COUNTRY", "")).strip().upper()
            if flow not in {"Exp", "Imp"} or not country:
                continue
            try:
                value = float(row.get("Value") or 0.0)
            except (TypeError, ValueError):
                continue

            value_eur_m = value / 1_000_000

            if country == "TOTAL":
                if flow == "Exp":
                    exports_total += value_eur_m
                else:
                    imports_total += value_eur_m
                continue

            entry = by_country.setdefault(country, {"exports": 0.0, "imports": 0.0})
            if flow == "Exp":
                entry["exports"] += value_eur_m
            else:
                entry["imports"] += value_eur_m

        if exports_total <= 0 and imports_total <= 0:
            exports_total = sum(item["exports"] for item in by_country.values())
            imports_total = sum(item["imports"] for item in by_country.values())

        total_trade = exports_total + imports_total
        partners: list[TradePartnerValue] = []
        for country_code, values in by_country.items():
            exports_eur_m = round(values["exports"], 2)
            imports_eur_m = round(values["imports"], 2)
            total_country_trade = round(exports_eur_m + imports_eur_m, 2)
            if total_country_trade <= 0.01:
                continue
            balance = round(exports_eur_m - imports_eur_m, 2)
            share = round((total_country_trade / total_trade) * 100, 2) if total_trade > 0 else 0.0
            names = country_names.get(country_code, {})
            partners.append(
                TradePartnerValue(
                    country_code=country_code,
                    country_name_lv=names.get("lv") or country_code,
                    country_name_en=names.get("en") or country_code,
                    exports_eur_m=exports_eur_m,
                    imports_eur_m=imports_eur_m,
                    balance_eur_m=balance,
                    total_trade_eur_m=total_country_trade,
                    share_of_total_trade_pct=share,
                )
            )

        partners.sort(key=lambda item: item.total_trade_eur_m, reverse=True)
        snapshot = TradeOverviewSnapshot(
            since_year=available_years[0],
            to_year=available_years[-1],
            selected_year=selected_year,
            total_exports_eur_m=round(exports_total, 2),
            total_imports_eur_m=round(imports_total, 2),
            trade_balance_eur_m=round(exports_total - imports_total, 2),
            source_dataset_id=self.trade_dataset_id,
            source_resource_id=values_resource["id"],
            country_map_resource_id=country_map_resource["id"],
            available_years=available_years,
            partners=partners[:safe_top],
        )
        self._trade_overview_cache_set(cache_key, snapshot)
        return snapshot

    def get_economy_structure(
        self,
        since_year: int = 2010,
        year: Optional[int] = None,
    ) -> EconomyStructureSnapshot:
        """Return economy split, export composition, and remittance metrics."""
        safe_since = max(2000, min(since_year, 2100))
        cache_key = (safe_since, year)
        cached = self._economy_structure_cache_get(cache_key)
        if cached is not None:
            return cached

        values_resource = self._resolve_trade_values_resource()
        available_years = self._resolve_trade_years(resource_id=values_resource["id"], since_year=safe_since)
        if not available_years:
            raise RuntimeError("No trade years available for economy structure.")

        selected_year = available_years[-1] if year is None else year
        if selected_year not in available_years:
            raise ValueError(f"No economy structure trade data found for year {selected_year}.")

        rows = self._fetch_records(
            resource_id=values_resource["id"],
            filters={"TIME": selected_year, "FLOW": "Exp", "COUNTRY": "TOTAL"},
            fields=["CN2Z", "Value"],
            page_size=5000,
            max_records=200000,
        )
        if not rows:
            raise RuntimeError(f"No export records found for year {selected_year}.")

        group_amounts: dict[str, float] = {group_id: 0.0 for group_id in EXPORT_GROUP_ORDER}
        total_exports_eur_m = 0.0
        fallback_total = 0.0

        for row in rows:
            code = str(row.get("CN2Z", "")).strip().upper()
            try:
                value = float(row.get("Value") or 0.0)
            except (TypeError, ValueError):
                continue

            value_eur_m = value / 1_000_000
            if code == "TOTAL":
                total_exports_eur_m += value_eur_m
                continue

            fallback_total += value_eur_m
            group_id = self._classify_export_group(code)
            group_amounts[group_id] = group_amounts.get(group_id, 0.0) + value_eur_m

        if total_exports_eur_m <= 0:
            total_exports_eur_m = fallback_total

        export_groups: list[EconomyExportGroup] = []
        for group_id in EXPORT_GROUP_ORDER:
            amount = round(group_amounts.get(group_id, 0.0), 2)
            share = round((amount / total_exports_eur_m) * 100, 2) if total_exports_eur_m > 0 else 0.0
            export_groups.append(
                EconomyExportGroup(
                    id=group_id,
                    amount_eur_m=amount,
                    share_pct=share,
                )
            )

        world_bank_end_year = max(selected_year, safe_since)
        services_series = self._fetch_world_bank_series("NV.SRV.TOTL.ZS", safe_since, world_bank_end_year)
        industry_series = self._fetch_world_bank_series("NV.IND.TOTL.ZS", safe_since, world_bank_end_year)
        agriculture_series = self._fetch_world_bank_series("NV.AGR.TOTL.ZS", safe_since, world_bank_end_year)
        ict_exports_series = self._fetch_world_bank_series("BX.GSR.CCIS.ZS", safe_since, world_bank_end_year)
        remittances_usd_series = self._fetch_world_bank_series("BX.TRF.PWKR.CD.DT", safe_since, world_bank_end_year)
        remittances_gdp_series = self._fetch_world_bank_series("BX.TRF.PWKR.DT.GD.ZS", safe_since, world_bank_end_year)

        services_share = self._select_series_value_at_or_before(services_series, selected_year)
        industry_share = self._select_series_value_at_or_before(industry_series, selected_year)
        agriculture_share = self._select_series_value_at_or_before(agriculture_series, selected_year)
        production_share: Optional[float]
        if industry_share is None and agriculture_share is None:
            production_share = None
        else:
            production_share = round((industry_share or 0.0) + (agriculture_share or 0.0), 2)

        manufacturing_exports_share = None
        if total_exports_eur_m > 0:
            manufacturing_total = group_amounts.get("manufacturing_other", 0.0) + group_amounts.get("lumber_wood", 0.0)
            manufacturing_exports_share = (manufacturing_total / total_exports_eur_m) * 100
        ict_services_exports_share = self._select_series_value_at_or_before(
            ict_exports_series,
            selected_year,
        )
        remittances_usd = self._select_series_value_at_or_before(remittances_usd_series, selected_year)
        remittances_share_gdp = self._select_series_value_at_or_before(remittances_gdp_series, selected_year)

        snapshot = EconomyStructureSnapshot(
            since_year=available_years[0],
            to_year=available_years[-1],
            selected_year=selected_year,
            available_years=available_years,
            production_share_pct=round(production_share, 2) if production_share is not None else None,
            services_share_pct=round(services_share, 2) if services_share is not None else None,
            agriculture_share_pct=round(agriculture_share, 2) if agriculture_share is not None else None,
            industry_share_pct=round(industry_share, 2) if industry_share is not None else None,
            manufacturing_exports_share_pct=(
                round(manufacturing_exports_share, 2) if manufacturing_exports_share is not None else None
            ),
            ict_services_exports_share_pct=(
                round(ict_services_exports_share, 2) if ict_services_exports_share is not None else None
            ),
            remittances_usd_m=round((remittances_usd or 0.0) / 1_000_000, 2) if remittances_usd is not None else None,
            remittances_share_gdp_pct=round(remittances_share_gdp, 2) if remittances_share_gdp is not None else None,
            total_exports_eur_m=round(total_exports_eur_m, 2),
            export_groups=export_groups,
            source_trade_dataset_id=self.trade_dataset_id,
            source_trade_resource_id=values_resource["id"],
            source_world_bank_country=self.world_bank_country_code,
        )
        self._economy_structure_cache_set(cache_key, snapshot)
        return snapshot

    def get_external_debt_overview(
        self,
        since_year: int = 2010,
        year: Optional[int] = None,
    ) -> ExternalDebtOverviewSnapshot:
        """Return external debt burden and servicing cost metrics with yearly trend."""
        safe_since = max(2000, min(since_year, 2100))
        cache_key = (safe_since, year)
        cached = self._external_debt_overview_cache_get(cache_key)
        if cached is not None:
            return cached

        indicator_external_debt = "DT.DOD.DECT.CD"
        indicator_debt_service = "DT.TDS.DECT.CD"
        indicator_debt_service_exports = "DT.TDS.DECT.EX.ZS"
        indicator_interest_payments = "DT.INT.DECT.CD"
        indicator_gov_debt_lcu = "GC.DOD.TOTL.CN"
        indicator_gov_debt_pct_gdp = "GC.DOD.TOTL.GD.ZS"
        indicator_interest_lcu = "GC.XPN.INTP.CN"
        indicator_exports_usd = "NE.EXP.GNFS.CD"
        indicator_population = "SP.POP.TOTL"
        indicator_gdp = "NY.GDP.MKTP.CD"
        indicator_fx = "PA.NUS.FCRF"  # LCU per USD; for Latvia LCU is EUR

        end_year = 2100
        external_debt_series = self._fetch_world_bank_series(indicator_external_debt, safe_since, end_year)
        debt_service_series = self._fetch_world_bank_series(indicator_debt_service, safe_since, end_year)
        debt_service_exports_series = self._fetch_world_bank_series(indicator_debt_service_exports, safe_since, end_year)
        interest_series = self._fetch_world_bank_series(indicator_interest_payments, safe_since, end_year)
        gov_debt_lcu_series = self._fetch_world_bank_series(indicator_gov_debt_lcu, safe_since, end_year)
        gov_debt_pct_gdp_series = self._fetch_world_bank_series(indicator_gov_debt_pct_gdp, safe_since, end_year)
        interest_lcu_series = self._fetch_world_bank_series(indicator_interest_lcu, safe_since, end_year)
        exports_usd_series = self._fetch_world_bank_series(indicator_exports_usd, safe_since, end_year)
        population_series = self._fetch_world_bank_series(indicator_population, safe_since, end_year)
        gdp_series = self._fetch_world_bank_series(indicator_gdp, safe_since, end_year)
        fx_series = self._fetch_world_bank_series(indicator_fx, safe_since, end_year)

        notes: list[str] = []
        debt_basis = "external_debt_world_bank"

        def lcu_to_usd(value_lcu: Optional[float], year_for_fx: int) -> Optional[float]:
            if value_lcu is None:
                return None
            fx = self._select_series_value_at_or_before(fx_series, year_for_fx)
            if fx is None or fx <= 0:
                return None
            return value_lcu / fx

        def lcu_series_to_usd(series_lcu: dict[int, float]) -> dict[int, float]:
            converted: dict[int, float] = {}
            for series_year, value_lcu in series_lcu.items():
                value_usd = lcu_to_usd(value_lcu, series_year)
                if value_usd is not None:
                    converted[series_year] = value_usd
            return converted

        debt_stock_usd_series = dict(external_debt_series)
        if not debt_stock_usd_series and gov_debt_lcu_series:
            debt_stock_usd_series = lcu_series_to_usd(gov_debt_lcu_series)
            debt_basis = "central_government_debt_proxy"
            notes.append(
                "External debt indicator DT.DOD.DECT.CD is unavailable for Latvia; using central government debt proxy."
            )
        if not debt_stock_usd_series and gov_debt_pct_gdp_series and gdp_series:
            for series_year, pct in gov_debt_pct_gdp_series.items():
                gdp_value = gdp_series.get(series_year)
                if gdp_value is None:
                    continue
                debt_stock_usd_series[series_year] = gdp_value * (pct / 100.0)
            if debt_stock_usd_series:
                debt_basis = "government_debt_pct_proxy"
                notes.append(
                    "Debt stock reconstructed from government debt (%GDP) and GDP due missing direct stock indicators."
                )
        if not debt_stock_usd_series and gdp_series:
            for series_year, gdp_value in gdp_series.items():
                debt_stock_usd_series[series_year] = gdp_value * 0.30
            if debt_stock_usd_series:
                debt_basis = "model_debt_ratio_proxy"
                notes.append(
                    "Debt stock estimated with a conservative 30% debt-to-GDP proxy because official debt stock series were unavailable."
                )

        if not debt_service_series and interest_lcu_series:
            debt_service_series = lcu_series_to_usd(interest_lcu_series)
            notes.append(
                "Debt service indicator DT.TDS.DECT.CD unavailable; using interest payments proxy for servicing costs."
            )
        if not debt_service_series and debt_stock_usd_series:
            debt_service_series = {
                series_year: value * 0.03
                for series_year, value in debt_stock_usd_series.items()
            }
            notes.append(
                "Debt service approximated at 3% of debt stock due missing servicing series."
            )

        if not interest_series and interest_lcu_series:
            interest_series = lcu_series_to_usd(interest_lcu_series)
            notes.append(
                "External-interest indicator DT.INT.DECT.CD unavailable; using government interest payments proxy."
            )
        if not interest_series and debt_service_series:
            interest_series = dict(debt_service_series)
            notes.append(
                "Interest payments approximated from debt service proxy."
            )

        available_years = sorted(
            y
            for y in (
                set(debt_stock_usd_series.keys())
                | set(gdp_series.keys())
                | set(population_series.keys())
            )
            if y >= safe_since
        )
        if not available_years:
            selected_year = year if year is not None else safe_since
            available_years = [selected_year]
            notes.append(
                "No World Bank time-series values were returned. Check outbound network access for the backend."
            )
        else:
            if year is None:
                selected_year = available_years[-1]
            elif year in available_years:
                selected_year = year
            else:
                older_years = [item for item in available_years if item <= year]
                if older_years:
                    selected_year = older_years[-1]
                    notes.append(
                        f"Requested year {year} is unavailable; showing nearest available year {selected_year}."
                    )
                else:
                    selected_year = available_years[0]
                    notes.append(
                        f"Requested year {year} is unavailable; showing earliest available year {selected_year}."
                    )

        def usd_to_eur(value_usd: Optional[float], year_for_fx: int) -> Optional[float]:
            if value_usd is None:
                return None
            fx = self._select_series_value_at_or_before(fx_series, year_for_fx)
            if fx is None or fx <= 0:
                return None
            return value_usd * fx

        external_debt_usd = self._select_series_value_at_or_before(debt_stock_usd_series, selected_year)
        debt_service_usd = self._select_series_value_at_or_before(debt_service_series, selected_year)
        debt_service_pct_exports = self._select_series_value_at_or_before(
            debt_service_exports_series,
            selected_year,
        )
        interest_usd = self._select_series_value_at_or_before(interest_series, selected_year)
        population = self._select_series_value_at_or_before(population_series, selected_year)
        gdp_usd = self._select_series_value_at_or_before(gdp_series, selected_year)

        if (
            debt_service_pct_exports is None
            and debt_service_usd is not None
        ):
            exports_usd = self._select_series_value_at_or_before(exports_usd_series, selected_year)
            if exports_usd is not None and exports_usd > 0:
                debt_service_pct_exports = (debt_service_usd / exports_usd) * 100

        external_debt_pct_gdp = None
        if debt_basis == "central_government_debt_proxy":
            gov_debt_pct = self._select_series_value_at_or_before(gov_debt_pct_gdp_series, selected_year)
            if gov_debt_pct is not None:
                external_debt_pct_gdp = round(gov_debt_pct, 2)
        if external_debt_pct_gdp is None and external_debt_usd is not None and gdp_usd is not None and gdp_usd > 0:
            external_debt_pct_gdp = round((external_debt_usd / gdp_usd) * 100, 2)

        external_debt_per_capita_usd = None
        if external_debt_usd is not None and population is not None and population > 0:
            external_debt_per_capita_usd = round(external_debt_usd / population, 2)

        external_debt_per_capita_eur = usd_to_eur(external_debt_per_capita_usd, selected_year)

        series: list[ExternalDebtOverviewPoint] = []
        for point_year in available_years:
            debt_point = debt_stock_usd_series.get(point_year)
            debt_service_point = debt_service_series.get(point_year)
            gdp_point = gdp_series.get(point_year)
            debt_pct_point = None
            if debt_point is not None and gdp_point is not None and gdp_point > 0:
                debt_pct_point = round((debt_point / gdp_point) * 100, 2)
            series.append(
                ExternalDebtOverviewPoint(
                    year=point_year,
                    external_debt_usd_m=round(debt_point / 1_000_000, 2) if debt_point is not None else None,
                    debt_service_usd_m=round(debt_service_point / 1_000_000, 2) if debt_service_point is not None else None,
                    external_debt_pct_gdp=debt_pct_point,
                )
            )

        snapshot = ExternalDebtOverviewSnapshot(
            since_year=available_years[0],
            to_year=available_years[-1],
            selected_year=selected_year,
            available_years=available_years,
            external_debt_usd_m=round(external_debt_usd / 1_000_000, 2) if external_debt_usd is not None else None,
            external_debt_eur_m=(
                round(usd_to_eur(external_debt_usd, selected_year) / 1_000_000, 2)
                if usd_to_eur(external_debt_usd, selected_year) is not None
                else None
            ),
            external_debt_per_capita_usd=external_debt_per_capita_usd,
            external_debt_per_capita_eur=round(external_debt_per_capita_eur, 2) if external_debt_per_capita_eur is not None else None,
            external_debt_pct_gdp=external_debt_pct_gdp,
            debt_service_usd_m=round(debt_service_usd / 1_000_000, 2) if debt_service_usd is not None else None,
            debt_service_eur_m=(
                round(usd_to_eur(debt_service_usd, selected_year) / 1_000_000, 2)
                if usd_to_eur(debt_service_usd, selected_year) is not None
                else None
            ),
            debt_service_pct_exports=round(debt_service_pct_exports, 2) if debt_service_pct_exports is not None else None,
            interest_payments_usd_m=round(interest_usd / 1_000_000, 2) if interest_usd is not None else None,
            interest_payments_eur_m=(
                round(usd_to_eur(interest_usd, selected_year) / 1_000_000, 2)
                if usd_to_eur(interest_usd, selected_year) is not None
                else None
            ),
            population_m=round(population / 1_000_000, 3) if population is not None else None,
            debt_basis=debt_basis,
            source_world_bank_country=self.world_bank_country_code,
            source_indicators=[
                indicator_external_debt,
                indicator_debt_service,
                indicator_debt_service_exports,
                indicator_interest_payments,
                indicator_gov_debt_lcu,
                indicator_gov_debt_pct_gdp,
                indicator_interest_lcu,
                indicator_exports_usd,
                indicator_population,
                indicator_gdp,
                indicator_fx,
            ],
            notes=notes,
            series=series,
        )
        self._external_debt_overview_cache_set(cache_key, snapshot)
        return snapshot

    def get_construction_overview(
        self,
        since_year: int = 2010,
        year: Optional[int] = None,
    ) -> ConstructionOverviewSnapshot:
        """Return construction activity and investment split (private vs public/SOE proxy)."""
        safe_since = max(2000, min(since_year, 2100))
        cache_key = (safe_since, year)
        cached = self._construction_overview_cache_get(cache_key)
        if cached is not None:
            return cached

        indicator_construction_share_gdp = "NV.IND.CNST.ZS"
        indicator_total_investment_share_gdp = "NE.GDI.FTOT.ZS"
        indicator_private_investment_share_gdp = "NE.GDI.FPRV.ZS"
        indicator_gdp_usd = "NY.GDP.MKTP.CD"
        indicator_fx = "PA.NUS.FCRF"  # LCU per USD (for Latvia, mostly EUR in current years)

        end_year = 2100
        construction_share_series = self._fetch_world_bank_series(indicator_construction_share_gdp, safe_since, end_year)
        total_investment_share_series = self._fetch_world_bank_series(
            indicator_total_investment_share_gdp, safe_since, end_year
        )
        private_investment_share_series = self._fetch_world_bank_series(
            indicator_private_investment_share_gdp, safe_since, end_year
        )
        gdp_usd_series = self._fetch_world_bank_series(indicator_gdp_usd, safe_since, end_year)
        fx_series = self._fetch_world_bank_series(indicator_fx, safe_since, end_year)

        notes: list[str] = []
        if not construction_share_series:
            notes.append(
                "World Bank construction value-added series is unavailable for Latvia in this endpoint; only investment split is shown."
            )

        # Budget-based public investment proxy (latest month in each yearly dataset, capital EKK rows).
        public_soe_proxy_by_year: dict[int, float] = {}
        try:
            resources_by_year = self._resolve_resources_by_year_from_urls(min_year=safe_since)
            for data_year, resource in sorted(resources_by_year.items()):
                available_fields = self._resolve_resource_fields(resource["id"])
                year_field = self._first_available_field(available_fields, ["Gads"])
                month_field = self._first_available_field(available_fields, ["Menesis_Atslega"])
                consolidation_field = self._first_available_field(available_fields, ["Konsolidacija"])
                amount_field = self._first_available_field(available_fields, ["Summa"])
                classification_field = self._first_available_field(available_fields, ["Klasifikacija"])
                ekk7_field = self._first_available_field(
                    available_fields,
                    ["Vienotais_EKK_Atslega_7_limenis", "Vienotais_EKK_Atslega_8_limenis", "Likuma_griezuma_EKK"],
                )
                ekk_name_field = self._first_available_field(
                    available_fields,
                    ["Vienotais_EKK_Nosaukums_8_limenis", "Likuma_griezuma_EKK"],
                )
                if not year_field or not month_field or not consolidation_field or not amount_field:
                    continue

                filters: Optional[dict[str, str]] = None
                if classification_field:
                    filters = {classification_field: "Izdevumi"}
                query_fields = [year_field, month_field, consolidation_field, amount_field]
                if ekk7_field:
                    query_fields.append(ekk7_field)
                if ekk_name_field:
                    query_fields.append(ekk_name_field)
                records = self._fetch_records(
                    resource_id=resource["id"],
                    filters=filters,
                    fields=query_fields,
                    page_size=5000,
                    max_records=300000,
                )
                latest_month = 0
                for row in records:
                    raw_year = str(row.get(year_field, "")).strip()
                    if raw_year != str(data_year):
                        continue
                    raw_month = str(row.get(month_field, "")).strip()
                    if not raw_month.isdigit():
                        continue
                    consolidation = str(row.get(consolidation_field, "")).strip().lower()
                    if "neto" not in consolidation or "transfert" not in consolidation:
                        continue
                    latest_month = max(latest_month, int(raw_month))

                if latest_month == 0:
                    continue

                capital_sum = 0.0
                for row in records:
                    raw_year = str(row.get(year_field, "")).strip()
                    raw_month = str(row.get(month_field, "")).strip()
                    if raw_year != str(data_year) or not raw_month.isdigit() or int(raw_month) != latest_month:
                        continue
                    consolidation = str(row.get(consolidation_field, "")).strip().lower()
                    if "neto" not in consolidation or "transfert" not in consolidation:
                        continue

                    ekk7 = str(row.get(ekk7_field, "")).strip() if ekk7_field else ""
                    classification_text = " ".join(
                        [
                            ekk7,
                            str(row.get(ekk_name_field, "")).strip() if ekk_name_field else "",
                        ]
                    )
                    normalized = self._normalize_text(classification_text)
                    is_capital = ekk7.startswith("5") or "kapital" in normalized
                    if not is_capital:
                        continue
                    try:
                        amount_raw = float(row.get(amount_field, 0.0) or 0.0)
                    except (TypeError, ValueError):
                        continue
                    if amount_raw > 0:
                        capital_sum += amount_raw

                if capital_sum > 0:
                    public_soe_proxy_by_year[data_year] = round(capital_sum / 1_000_000, 2)
        except Exception:
            notes.append(
                "Could not derive budget-based public/SOE proxy from capital expenditure rows."
            )

        available_years = sorted(
            y
            for y in (
                set(construction_share_series.keys())
                | set(total_investment_share_series.keys())
                | set(private_investment_share_series.keys())
                | set(gdp_usd_series.keys())
                | set(public_soe_proxy_by_year.keys())
            )
            if y >= safe_since
        )
        if not available_years:
            raise RuntimeError(
                "No World Bank construction/investment time-series returned for selected period."
            )

        if year is None:
            selected_year = available_years[-1]
        elif year in available_years:
            selected_year = year
        else:
            older_years = [item for item in available_years if item <= year]
            if older_years:
                selected_year = older_years[-1]
                notes.append(
                    f"Requested year {year} is unavailable; showing nearest available year {selected_year}."
                )
            else:
                selected_year = available_years[0]
                notes.append(
                    f"Requested year {year} is unavailable; showing earliest available year {selected_year}."
                )

        warned_fx_proxy = False
        warned_private_clamp = False
        used_budget_public_proxy = False

        def usd_to_eur(value_usd: Optional[float], year_for_fx: int) -> Optional[float]:
            nonlocal warned_fx_proxy
            if value_usd is None:
                return None
            fx = self._select_series_value_at_or_before(fx_series, year_for_fx)
            if fx is None or fx <= 0:
                if not warned_fx_proxy:
                    notes.append(
                        "FX series missing for some years; investment amounts may use USD-as-EUR proxy."
                    )
                    warned_fx_proxy = True
                return value_usd
            return value_usd * fx

        def pct_of_gdp_to_eur_m(pct_of_gdp: Optional[float], target_year: int) -> Optional[float]:
            if pct_of_gdp is None:
                return None
            gdp_usd = self._select_series_value_at_or_before(gdp_usd_series, target_year)
            if gdp_usd is None:
                return None
            amount_usd = gdp_usd * (pct_of_gdp / 100.0)
            amount_eur = usd_to_eur(amount_usd, target_year)
            return round(amount_eur / 1_000_000, 2) if amount_eur is not None else None

        def split_shares(target_year: int) -> tuple[Optional[float], Optional[float], Optional[float]]:
            nonlocal warned_private_clamp
            total_pct = self._select_series_value_at_or_before(total_investment_share_series, target_year)
            private_pct = self._select_series_value_at_or_before(private_investment_share_series, target_year)
            if total_pct is None or private_pct is None:
                return total_pct, private_pct, None
            if private_pct > total_pct:
                if not warned_private_clamp:
                    notes.append(
                        "Private investment exceeded total in some years; private share was capped at total."
                    )
                    warned_private_clamp = True
                private_pct = total_pct
            public_pct = max(total_pct - private_pct, 0.0)
            return total_pct, private_pct, public_pct

        def build_point(target_year: int) -> ConstructionOverviewPoint:
            nonlocal used_budget_public_proxy
            total_pct, private_pct, public_pct = split_shares(target_year)
            total_eur_m = pct_of_gdp_to_eur_m(total_pct, target_year)
            private_eur_m = pct_of_gdp_to_eur_m(private_pct, target_year)
            public_eur_m = pct_of_gdp_to_eur_m(public_pct, target_year)

            # Fallback: if private/public split missing, estimate public from budget capex proxy.
            budget_public_proxy = public_soe_proxy_by_year.get(target_year)
            if private_eur_m is None and total_eur_m is not None and budget_public_proxy is not None:
                used_budget_public_proxy = True
                public_eur_m = min(total_eur_m, budget_public_proxy)
                private_eur_m = max(total_eur_m - public_eur_m, 0.0)

            private_share_pct = None
            public_share_pct = None
            if total_eur_m is not None and total_eur_m > 0 and private_eur_m is not None:
                private_share_pct = (private_eur_m / total_eur_m) * 100.0
                if public_eur_m is not None:
                    public_share_pct = (public_eur_m / total_eur_m) * 100.0

            construction_share = self._select_series_value_at_or_before(construction_share_series, target_year)
            construction_eur_m = pct_of_gdp_to_eur_m(construction_share, target_year)

            return ConstructionOverviewPoint(
                year=target_year,
                construction_value_added_eur_m=construction_eur_m,
                construction_share_gdp_pct=round(construction_share, 2) if construction_share is not None else None,
                total_fixed_investment_eur_m=total_eur_m,
                private_fixed_investment_eur_m=round(private_eur_m, 2) if private_eur_m is not None else None,
                public_soe_proxy_investment_eur_m=round(public_eur_m, 2) if public_eur_m is not None else None,
                private_share_pct=round(private_share_pct, 2) if private_share_pct is not None else None,
                public_soe_proxy_share_pct=round(public_share_pct, 2) if public_share_pct is not None else None,
            )

        selected_point = build_point(selected_year)
        selected_construction_share = self._select_series_value_at_or_before(construction_share_series, selected_year)

        series: list[ConstructionOverviewPoint] = []
        for point_year in available_years:
            series.append(build_point(point_year))

        notes.append(
            "SOE split is not published as a standalone official series; public fixed investment is used as SOE/public proxy."
        )
        if used_budget_public_proxy:
            notes.append(
                "Where private/public split is missing in World Bank, public/SOE proxy is estimated from budget capital expenditure (EKK 5*) and private is derived as residual."
            )

        snapshot = ConstructionOverviewSnapshot(
            since_year=available_years[0],
            to_year=available_years[-1],
            selected_year=selected_year,
            available_years=available_years,
            construction_value_added_eur_m=selected_point.construction_value_added_eur_m,
            construction_share_gdp_pct=(
                round(selected_construction_share, 2) if selected_construction_share is not None else None
            ),
            total_fixed_investment_eur_m=selected_point.total_fixed_investment_eur_m,
            private_fixed_investment_eur_m=selected_point.private_fixed_investment_eur_m,
            public_soe_proxy_investment_eur_m=selected_point.public_soe_proxy_investment_eur_m,
            private_share_pct=selected_point.private_share_pct,
            public_soe_proxy_share_pct=selected_point.public_soe_proxy_share_pct,
            source_world_bank_country=self.world_bank_country_code,
            source_indicators=[
                indicator_construction_share_gdp,
                indicator_total_investment_share_gdp,
                indicator_private_investment_share_gdp,
                indicator_gdp_usd,
                indicator_fx,
                "budget_capex_proxy_ekk5",
            ],
            notes=notes,
            series=series,
        )
        self._construction_overview_cache_set(cache_key, snapshot)
        return snapshot

    def get_expenditure_positions(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None,
        group_by: Literal["ekk", "program", "institution", "ministry"] = "ekk",
        limit: int = 12,
    ) -> BudgetExpenditurePositionsSnapshot:
        """Return top expenditure positions by selected grouping for one period."""
        if month is not None and year is None:
            raise ValueError("When 'month' is provided, 'year' must also be provided.")

        safe_group = group_by if group_by in {"ekk", "program", "institution", "ministry"} else "ekk"
        safe_limit = max(5, min(limit, 50))
        cache_key = (year, month, safe_group, safe_limit)
        cached = self._expenditure_positions_cache_get(cache_key)
        if cached is not None:
            return cached

        resources_by_year = self._resolve_resources_by_year_from_urls(min_year=2000)
        if resources_by_year:
            available_years = sorted(resources_by_year.keys())
            resolved_year = available_years[-1] if year is None else year
            source_resource = resources_by_year.get(resolved_year)
            if source_resource is None:
                raise ValueError(f"No expenditure position data found for year {resolved_year}.")
            selected_year, selected_month, month_name = self._resolve_period(
                source_resource["id"], year=resolved_year, month=month
            )
        else:
            source_resource = self._resolve_source_resource()
            selected_year, selected_month, month_name = self._resolve_period(
                source_resource["id"], year=year, month=month
            )
            available_years = self._resolve_available_years(source_resource["id"])

        available_fields = self._resolve_resource_fields(source_resource["id"])
        grouping_candidates: dict[str, list[str]] = {
            "ekk": [
                "Vienotais_EKK_Nosaukums_8_limenis",
                "Likuma_griezuma_EKK",
                "Vienotais_EKK_Atslega_8_limenis",
                "Vienotais_EKK_Atslega_7_limenis",
            ],
            "program": [
                "Programma_nosaukums",
                "Apaksprogramma_nosaukums",
                "Programma",
                "Programmas_nosaukums",
                "Programmas_kods",
            ],
            "institution": [
                "Iestade_nosaukums",
                "Iestades_nosaukums",
                "Maksataja_iestades_nosaukums",
                "Maksataja_iestade_nosaukums",
            ],
            "ministry": ["Ministrija_nosaukums"],
        }
        label_field = self._first_available_field(available_fields, grouping_candidates[safe_group])
        if not label_field:
            label_field = "Ministrija_nosaukums"
            safe_group = "ministry"

        query_fields = [
            "Konsolidacija",
            "Summa",
            label_field,
        ]
        records = self._fetch_records(
            resource_id=source_resource["id"],
            filters={
                "Gads": str(selected_year),
                "Menesis_Atslega": str(selected_month),
                "Klasifikacija": "Izdevumi",
            },
            fields=query_fields,
            page_size=5000,
            max_records=300000,
        )

        aggregated: dict[str, float] = {}
        total_expenditure = 0.0
        for record in records:
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue
            try:
                amount_raw = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue
            if amount_raw <= 0:
                continue
            label = str(record.get(label_field, "")).strip() or "Nezināma pozīcija"
            total_expenditure += amount_raw
            aggregated[label] = aggregated.get(label, 0.0) + amount_raw

        if total_expenditure <= 0:
            raise RuntimeError("No positive expenditure records found for selected grouping.")

        total_eur_m = total_expenditure / 1_000_000
        sorted_rows = sorted(aggregated.items(), key=lambda item: item[1], reverse=True)
        positions = [
            BudgetExpenditurePosition(
                id=self._slugify(label),
                label=label,
                amount_eur_m=round(amount / 1_000_000, 2),
                share_pct=round((amount / total_expenditure) * 100, 2),
            )
            for label, amount in sorted_rows[:safe_limit]
        ]

        group_labels = {
            "ekk": "EKK klasifikācija",
            "program": "Programmas / apakšprogrammas",
            "institution": "Iestādes",
            "ministry": "Ministrijas",
        }
        snapshot = BudgetExpenditurePositionsSnapshot(
            year=selected_year,
            month=selected_month,
            month_name=month_name,
            available_years=available_years,
            group_by=safe_group,
            group_label=group_labels.get(safe_group, "Pozīcijas"),
            total_expenditure_eur_m=round(total_eur_m, 2),
            source_dataset_id=self.dataset_id,
            source_resource_id=source_resource["id"],
            source_last_modified=source_resource.get("last_modified"),
            source_url=source_resource.get("url"),
            positions=positions,
        )
        self._expenditure_positions_cache_set(cache_key, snapshot)
        return snapshot

    def get_procurement_kpis(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None,
        top_n: int = 10,
    ) -> BudgetProcurementKpiSnapshot:
        """Return procurement-oriented KPI view from available budget execution rows."""
        if month is not None and year is None:
            raise ValueError("When 'month' is provided, 'year' must also be provided.")

        safe_top_n = max(5, min(top_n, 30))
        cache_key = (year, month, safe_top_n)
        cached = self._procurement_kpi_cache_get(cache_key)
        if cached is not None:
            return cached

        resources_by_year = self._resolve_resources_by_year_from_urls(min_year=2000)
        if resources_by_year:
            available_years = sorted(resources_by_year.keys())
            resolved_year = available_years[-1] if year is None else year
            source_resource = resources_by_year.get(resolved_year)
            if source_resource is None:
                raise ValueError(f"No procurement KPI data found for year {resolved_year}.")
            selected_year, selected_month, month_name = self._resolve_period(
                source_resource["id"], year=resolved_year, month=month
            )
        else:
            source_resource = self._resolve_source_resource()
            selected_year, selected_month, month_name = self._resolve_period(
                source_resource["id"], year=year, month=month
            )
            available_years = self._resolve_available_years(source_resource["id"])
        available_fields = self._resolve_resource_fields(source_resource["id"])

        ministry_field = self._first_available_field(
            available_fields,
            ["Ministrija_nosaukums", "Maksataja_iestade_nosaukums", "Maksataja_iestades_nosaukums"],
        ) or "Ministrija_nosaukums"
        supplier_field = self._first_available_field(
            available_fields,
            [
                "Sanemeja_nosaukums",
                "Saņēmēja_nosaukums",
                "Recipient_name",
                "recipient_name",
                "Saņēmējs",
            ],
        )
        ekk_field = self._first_available_field(
            available_fields,
            ["Vienotais_EKK_Nosaukums_8_limenis", "Likuma_griezuma_EKK"],
        )
        project_field = self._first_available_field(
            available_fields,
            ["Projekts_nosaukums", "Programma_nosaukums", "Apaksprogramma_nosaukums"],
        )

        query_fields = ["Konsolidacija", "Summa", ministry_field]
        if supplier_field:
            query_fields.append(supplier_field)
        if ekk_field:
            query_fields.append(ekk_field)
        if project_field:
            query_fields.append(project_field)

        records = self._fetch_records(
            resource_id=source_resource["id"],
            filters={
                "Gads": str(selected_year),
                "Menesis_Atslega": str(selected_month),
                "Klasifikacija": "Izdevumi",
            },
            fields=query_fields,
            page_size=5000,
            max_records=350000,
        )

        total_expenditure = 0.0
        procurement_like = 0.0
        purchasers: dict[str, float] = {}
        suppliers: dict[str, float] = {}

        procurement_tokens = (
            "iepirk",
            "pakalpoj",
            "prece",
            "precu",
            "materi",
            "iekart",
            "aprikoj",
            "buvniec",
            "capital transfer",
            "kapitala",
        )

        for record in records:
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue
            try:
                amount_raw = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue
            if amount_raw <= 0:
                continue
            total_expenditure += amount_raw

            classification_blob = " ".join(
                part
                for part in (
                    str(record.get(ekk_field, "")).strip() if ekk_field else "",
                    str(record.get(project_field, "")).strip() if project_field else "",
                )
                if part
            )
            normalized_blob = self._normalize_text(classification_blob)
            if not normalized_blob:
                continue

            if any(token in normalized_blob for token in procurement_tokens):
                procurement_like += amount_raw
                purchaser_label = str(record.get(ministry_field, "")).strip() or "Nezināms pasūtītājs"
                purchasers[purchaser_label] = purchasers.get(purchaser_label, 0.0) + amount_raw
                if supplier_field:
                    supplier_label = str(record.get(supplier_field, "")).strip()
                    if supplier_label:
                        suppliers[supplier_label] = suppliers.get(supplier_label, 0.0) + amount_raw

        if total_expenditure <= 0:
            raise RuntimeError("No positive expenditure records found for procurement KPI calculation.")

        def to_entities(values: dict[str, float]) -> list[BudgetProcurementEntity]:
            sorted_rows = sorted(values.items(), key=lambda item: item[1], reverse=True)[:safe_top_n]
            return [
                BudgetProcurementEntity(
                    id=self._slugify(label),
                    label=label,
                    amount_eur_m=round(amount / 1_000_000, 2),
                    share_pct=round((amount / procurement_like) * 100, 2) if procurement_like > 0 else 0.0,
                )
                for label, amount in sorted_rows
            ]

        notes = [
            "Single-bid share, bidder count, and initial-vs-actual contract delta require tender-level procurement datasets (IUB/EIS).",
            "Current values are derived from budget execution classification text and should be treated as procurement-like spending proxy.",
        ]
        if not supplier_field:
            notes.append("Supplier-level field was not detected in source schema for selected resource.")

        snapshot = BudgetProcurementKpiSnapshot(
            year=selected_year,
            month=selected_month,
            month_name=month_name,
            available_years=available_years,
            total_expenditure_eur_m=round(total_expenditure / 1_000_000, 2),
            procurement_like_expenditure_eur_m=round(procurement_like / 1_000_000, 2),
            procurement_like_share_pct=round((procurement_like / total_expenditure) * 100, 2),
            single_bid_share_pct=None,
            avg_bidder_count=None,
            initial_vs_actual_contract_delta_pct=None,
            top_purchasers=to_entities(purchasers),
            top_suppliers=to_entities(suppliers),
            source_dataset_id=self.dataset_id,
            source_resource_id=source_resource["id"],
            source_last_modified=source_resource.get("last_modified"),
            source_url=source_resource.get("url"),
            notes=notes,
        )
        self._procurement_kpi_cache_set(cache_key, snapshot)
        return snapshot

    def _fetch_all_years_data(
        self, resource_id: str, since_year: int
    ) -> tuple[dict[int, dict[str, float]], dict[int, tuple[int, str]]]:
        """Fetch and aggregate expenditure by ministry for all years since since_year.

        Note: Each CKAN resource typically contains one year of data. This method
        fetches from the primary resource and falls back to querying all available
        resources if needed.
        """

        # First try: Check if single resource has multi-year data
        records = self._fetch_records(
            resource_id=resource_id,
            filters={"Klasifikacija": "Izdevumi"},
            fields=["Gads", "Menesis_Atslega", "Menesis_nosaukums",
                    "Ministrija_nosaukums", "Konsolidacija", "Summa"],
            page_size=5000,
            max_records=200000,
        )

        # Group by year
        yearly_records: dict[int, list[dict[str, Any]]] = {}
        for record in records:
            raw_year = str(record.get("Gads", "")).strip()
            if not raw_year.isdigit():
                continue
            year = int(raw_year)
            if year < since_year:
                continue
            if year not in yearly_records:
                yearly_records[year] = []
            yearly_records[year].append(record)

        # If we only got one year from primary resource, try fetching from other resources
        if len(yearly_records) <= 1:
            logger.info("Primary resource only has %d year(s), attempting multi-resource fetch", len(yearly_records))
            resources_by_year = self._resolve_resources_by_year_from_urls(since_year)

            for year, resource in sorted(resources_by_year.items()):
                if year not in yearly_records:  # Don't re-fetch if we already have it
                    year_records = self._fetch_records(
                        resource_id=resource["id"],
                        filters={"Klasifikacija": "Izdevumi"},
                        fields=["Gads", "Menesis_Atslega", "Menesis_nosaukums",
                                "Ministrija_nosaukums", "Konsolidacija", "Summa"],
                        page_size=5000,
                        max_records=50000,
                    )
                    if year_records:
                        yearly_records[year] = year_records

        # Aggregate each year
        yearly_group_amounts: dict[int, dict[str, float]] = {}
        yearly_month: dict[int, tuple[int, str]] = {}

        for year in sorted(yearly_records.keys()):
            month, month_name, group_amounts = self._aggregate_year_from_records(
                yearly_records[year]
            )
            if group_amounts:  # Only add years with data
                yearly_group_amounts[year] = group_amounts
                yearly_month[year] = (month, month_name)

        return yearly_group_amounts, yearly_month

    def _aggregate_year_from_records(
        self, records: list[dict[str, Any]]
    ) -> tuple[int, str, dict[str, float]]:
        """Aggregate one year's records into ministry totals."""

        # Find latest month in this year
        latest_month = 0
        month_name_map: dict[int, str] = {}

        filtered: list[dict[str, Any]] = []
        for record in records:
            raw_month = str(record.get("Menesis_Atslega", "")).strip()
            if not raw_month.isdigit():
                continue
            month = int(raw_month)
            if month < 1 or month > 12:
                continue

            # Filter consolidation
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue

            filtered.append(record)
            latest_month = max(latest_month, month)
            month_name_map[month] = str(record.get("Menesis_nosaukums", "")).strip()

        if latest_month == 0:
            return 1, "", {}

        # Aggregate by ministry for latest month only
        aggregated: dict[str, float] = {}
        for record in filtered:
            month = int(str(record.get("Menesis_Atslega", "0")).strip() or "0")
            if month != latest_month:
                continue

            label = str(record.get("Ministrija_nosaukums", "")).strip()
            if not label:
                continue

            try:
                amount = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue

            aggregated[label] = aggregated.get(label, 0.0) + amount

        # Convert to millions EUR, filter zeros
        groups = {
            label: round(value / 1_000_000, 2)
            for label, value in aggregated.items()
            if value > 0.01  # Filter near-zero values
        }

        return latest_month, month_name_map.get(latest_month, ""), groups

    def _resolve_source_resource(self) -> dict[str, Any]:
        return self._resolve_source_resource_for_dataset(
            dataset_id=self.dataset_id,
            resource_id_override=self.resource_id_override,
        )

    def _resolve_resources_by_year_from_urls(self, min_year: int) -> dict[int, dict[str, Any]]:
        """Extract year from resource URLs (e.g., file_2024.csv -> 2024)."""
        return self._resolve_resources_by_year_from_urls_for_dataset(
            dataset_id=self.dataset_id,
            min_year=min_year,
            resource_id_override=self.resource_id_override,
        )

    def _resolve_source_resource_for_dataset(
        self,
        dataset_id: str,
        resource_id_override: Optional[str] = None,
    ) -> dict[str, Any]:
        if resource_id_override:
            return {"id": resource_id_override, "last_modified": None, "url": None}

        payload = self._api_action("package_show", {"id": dataset_id})
        resources = payload.get("resources", [])
        if not isinstance(resources, list) or not resources:
            raise RuntimeError(f"No resources found for configured dataset: {dataset_id}.")

        candidates = [
            resource
            for resource in resources
            if resource.get("datastore_active") and str(resource.get("format", "")).upper() in {"CSV", "XLS", "XLSX"}
        ]
        if not candidates:
            raise RuntimeError(f"No datastore-enabled resources available in dataset: {dataset_id}.")

        candidates.sort(key=lambda item: str(item.get("metadata_modified", "")), reverse=True)
        return candidates[0]

    def _resolve_resources_by_year_from_urls_for_dataset(
        self,
        dataset_id: str,
        min_year: int,
        resource_id_override: Optional[str] = None,
    ) -> dict[int, dict[str, Any]]:
        if resource_id_override:
            # With explicit resource override we do not infer per-year resources from package metadata.
            return {}

        payload = self._api_action("package_show", {"id": dataset_id})
        resources = payload.get("resources", [])
        if not isinstance(resources, list) or not resources:
            return {}

        candidates = [
            resource
            for resource in resources
            if resource.get("datastore_active") and str(resource.get("format", "")).upper() in {"CSV", "XLS", "XLSX"}
        ]
        by_year: dict[int, dict[str, Any]] = {}
        for resource in candidates:
            # Extract year from URL pattern like "file_2024.csv"
            url = str(resource.get("url", ""))
            year_match = re.search(r"_(\d{4})\.(csv|xls|xlsx)", url, re.IGNORECASE)
            if year_match:
                year = int(year_match.group(1))
                if year >= min_year:
                    current = by_year.get(year)
                    if current is None:
                        by_year[year] = resource
                    elif str(resource.get("metadata_modified", "")) > str(current.get("metadata_modified", "")):
                        by_year[year] = resource
        return by_year

    def _resolve_trade_values_resource(self) -> dict[str, Any]:
        if self.trade_resource_id_override:
            return {"id": self.trade_resource_id_override}
        payload = self._api_action("package_show", {"id": self.trade_dataset_id})
        resources = payload.get("resources", [])
        if not isinstance(resources, list) or not resources:
            raise RuntimeError("No resources found for configured trade dataset.")

        for resource in resources:
            if not resource.get("datastore_active"):
                continue
            url = str(resource.get("url", "")).lower()
            if "atd020_01.csv" in url:
                return resource

        csv_candidates = [
            resource
            for resource in resources
            if resource.get("datastore_active") and str(resource.get("format", "")).upper() == "CSV"
        ]
        if not csv_candidates:
            raise RuntimeError("No datastore CSV resources in trade dataset.")
        return csv_candidates[0]

    def _resolve_trade_country_map_resource(self) -> dict[str, Any]:
        if self.trade_country_map_resource_id_override:
            return {"id": self.trade_country_map_resource_id_override}
        payload = self._api_action("package_show", {"id": self.trade_dataset_id})
        resources = payload.get("resources", [])
        if not isinstance(resources, list) or not resources:
            raise RuntimeError("No resources found for configured trade dataset.")

        for resource in resources:
            if not resource.get("datastore_active"):
                continue
            url = str(resource.get("url", "")).lower()
            if "countries_ft.tsv" in url:
                return resource

        raise RuntimeError("Trade country map resource not found in dataset.")

    def _resolve_trade_years(self, resource_id: str, since_year: int) -> list[int]:
        rows = self._fetch_records(
            resource_id=resource_id,
            filters=None,
            fields=["TIME"],
            page_size=5000,
            max_records=500000,
        )
        years = sorted(
            {
                int(str(row.get("TIME")).strip())
                for row in rows
                if str(row.get("TIME", "")).strip().isdigit() and int(str(row.get("TIME")).strip()) >= since_year
            }
        )
        return years

    def _fetch_trade_country_names(self, resource_id: str) -> dict[str, dict[str, str]]:
        rows = self._fetch_records(
            resource_id=resource_id,
            filters=None,
            fields=["ValueCode", "ValueTextL", "ValueTextL_Eng"],
            page_size=1000,
            max_records=2000,
        )
        names: dict[str, dict[str, str]] = {}
        for row in rows:
            code = str(row.get("ValueCode", "")).strip().upper()
            if not code:
                continue
            names[code] = {
                "lv": str(row.get("ValueTextL", "")).strip(),
                "en": str(row.get("ValueTextL_Eng", "")).strip(),
            }
        return names

    def _classify_export_group(self, cn2z: str) -> str:
        match = re.search(r"(\d{2})", cn2z)
        if not match:
            return "other_goods"
        chapter = int(match.group(1))
        if 1 <= chapter <= 24:
            return "agriculture_food"
        if 44 <= chapter <= 49:
            return "lumber_wood"
        if 25 <= chapter <= 99:
            return "manufacturing_other"
        return "other_goods"

    def _fetch_world_bank_series(
        self,
        indicator_code: str,
        start_year: int,
        end_year: int,
    ) -> dict[int, float]:
        url = (
            f"{self.world_bank_base_url.rstrip('/')}/country/{self.world_bank_country_code}/indicator/{indicator_code}"
        )
        try:
            response = self._http.get(
                url,
                params={
                    "format": "json",
                    "date": f"{start_year}:{end_year}",
                    "per_page": 1000,
                },
                timeout=min(self.request_timeout_sec, 4.0),
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.warning("World Bank indicator fetch failed indicator=%s: %s", indicator_code, type(exc).__name__)
            return {}

        if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
            return {}

        series: dict[int, float] = {}
        for row in payload[1]:
            if not isinstance(row, dict):
                continue
            raw_year = str(row.get("date", "")).strip()
            value = row.get("value")
            if not raw_year.isdigit() or value is None:
                continue
            try:
                series[int(raw_year)] = float(value)
            except (TypeError, ValueError):
                continue
        return series

    def _select_series_value_at_or_before(
        self,
        series: dict[int, float],
        selected_year: int,
    ) -> Optional[float]:
        if not series:
            return None
        if selected_year in series:
            return series[selected_year]
        candidates = [year for year in series.keys() if year <= selected_year]
        if not candidates:
            return None
        return series[max(candidates)]

    def _aggregate_revenue_monthly_from_records(
        self,
        records: list[dict[str, Any]],
    ) -> dict[int, tuple[str, dict[str, float]]]:
        month_name_map: dict[int, str] = {}
        aggregated_by_month: dict[int, dict[str, float]] = {}

        for record in records:
            raw_month = str(record.get("Menesis_Atslega", "")).strip()
            if not raw_month.isdigit():
                continue
            month = int(raw_month)
            if month < 1 or month > 12:
                continue

            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue

            month_name_map[month] = str(record.get("Menesis_nosaukums", "")).strip()
            if month not in aggregated_by_month:
                aggregated_by_month[month] = {item[0]: 0.0 for item in REVENUE_SOURCE_DEFINITIONS}

            try:
                amount = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue

            text_blob = " ".join(
                str(record.get(key, "")).strip()
                for key in (
                    "Likuma_griezuma_EKK",
                    "Vienotais_EKK_Nosaukums_8_limenis",
                    "Projekts_nosaukums",
                    "Vienotais_EKK_Atslega_8_limenis",
                    "Vienotais_EKK_Atslega_7_limenis",
                )
            )
            category = self._classify_revenue_source(text_blob)
            aggregated_by_month[month][category] = aggregated_by_month[month].get(category, 0.0) + amount

        result: dict[int, tuple[str, dict[str, float]]] = {}
        for month, category_amounts in aggregated_by_month.items():
            in_millions = {key: round(value / 1_000_000, 2) for key, value in category_amounts.items()}
            result[month] = (month_name_map.get(month, ""), in_millions)
        return result

    def _aggregate_revenue_category_details_from_records(
        self,
        records: list[dict[str, Any]],
    ) -> dict[str, dict[str, float]]:
        detail_amounts: dict[str, dict[str, float]] = {
            item[0]: {} for item in REVENUE_SOURCE_DEFINITIONS
        }
        for record in records:
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue

            try:
                amount = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue

            text_blob = " ".join(
                str(record.get(key, "")).strip()
                for key in (
                    "Likuma_griezuma_EKK",
                    "Vienotais_EKK_Nosaukums_8_limenis",
                    "Projekts_nosaukums",
                    "Vienotais_EKK_Atslega_8_limenis",
                    "Vienotais_EKK_Atslega_7_limenis",
                )
            )
            category = self._classify_revenue_source(text_blob)
            detail_label = self._detail_label_from_record(record)

            category_details = detail_amounts.setdefault(category, {})
            category_details[detail_label] = category_details.get(detail_label, 0.0) + amount

        converted: dict[str, dict[str, float]] = {}
        for category_id, items in detail_amounts.items():
            converted[category_id] = {
                label: round(value / 1_000_000, 2)
                for label, value in items.items()
                if abs(value) >= 10_000  # Hide very small lines (<0.01M)
            }
        return converted

    def _sum_revenue_category_maps(self, category_maps: list[dict[str, float]]) -> dict[str, float]:
        totals: dict[str, float] = {item[0]: 0.0 for item in REVENUE_SOURCE_DEFINITIONS}
        for category_map in category_maps:
            for category_id, amount in category_map.items():
                totals[category_id] = round(totals.get(category_id, 0.0) + amount, 2)
        return totals

    def _resolve_resources_by_year(self, min_year: int) -> dict[int, dict[str, Any]]:
        """Deprecated: Use _resolve_resources_by_year_from_urls instead."""
        payload = self._api_action("package_show", {"id": self.dataset_id})
        resources = payload.get("resources", [])
        if not isinstance(resources, list) or not resources:
            return {}

        candidates = [
            resource
            for resource in resources
            if resource.get("datastore_active") and str(resource.get("format", "")).upper() in {"CSV", "XLS", "XLSX"}
        ]
        by_year: dict[int, dict[str, Any]] = {}

        for resource in candidates:
            year = self._extract_year_from_resource(resource)
            if year is None or year < min_year:
                continue
            current = by_year.get(year)
            if current is None:
                by_year[year] = resource
                continue
            if str(resource.get("metadata_modified", "")) > str(current.get("metadata_modified", "")):
                by_year[year] = resource
        return by_year

    def _resolve_period(
        self, resource_id: str, year: Optional[int], month: Optional[int]
    ) -> tuple[int, int, str]:
        records = self._fetch_records(
            resource_id=resource_id,
            filters=None,
            fields=["Gads", "Menesis_Atslega", "Menesis_nosaukums"],
            page_size=1000,
            max_records=12000,
        )
        if not records:
            raise RuntimeError("Unable to determine latest available budget period.")

        periods: dict[tuple[int, int], str] = {}
        for record in records:
            raw_year = str(record.get("Gads", "")).strip()
            raw_month = str(record.get("Menesis_Atslega", "")).strip()
            if not raw_year.isdigit() or not raw_month.isdigit():
                continue
            y = int(raw_year)
            m = int(raw_month)
            if m < 1 or m > 12:
                continue
            month_name = str(record.get("Menesis_nosaukums", "")).strip()
            periods[(y, m)] = month_name

        if not periods:
            raise RuntimeError("No valid year/month values in budget dataset.")

        if year is not None and month is not None:
            month_name = periods.get((year, month))
            if month_name is None:
                raise ValueError(f"No budget data found for period {year}-{month:02d}.")
            return year, month, month_name

        if year is not None:
            month_candidates = [m for (y, m) in periods if y == year]
            if not month_candidates:
                raise ValueError(f"No budget data found for year {year}.")
            resolved_month = max(month_candidates)
            return year, resolved_month, periods.get((year, resolved_month), "")

        resolved_year, resolved_month = max(periods.keys())
        return resolved_year, resolved_month, periods.get((resolved_year, resolved_month), "")

    def _query_divisions(self, resource_id: str, year: int, month: int) -> list[tuple[str, float]]:
        records = self._fetch_records(
            resource_id=resource_id,
            filters={
                "Gads": str(year),
                "Menesis_Atslega": str(month),
                "Klasifikacija": "Izdevumi",
            },
            fields=["Ministrija_nosaukums", "Summa", "Konsolidacija"],
            page_size=1000,
            max_records=30000,
        )
        aggregated: dict[str, float] = {}
        for record in records:
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue
            label = str(record.get("Ministrija_nosaukums", "")).strip()
            if not label:
                continue
            raw_amount = record.get("Summa", 0.0)
            try:
                amount = float(raw_amount or 0.0)
            except (TypeError, ValueError):
                continue
            aggregated[label] = aggregated.get(label, 0.0) + amount

        items = [(label, round(value / 1_000_000, 2)) for label, value in aggregated.items() if value > 0]
        items.sort(key=lambda item: item[1], reverse=True)
        return items

    def _aggregate_year_for_resource(
        self, resource_id: str, year: int
    ) -> tuple[int, str, dict[str, float]]:
        try:
            return self._aggregate_year_for_resource_sql(resource_id, year)
        except Exception as exc:
            logger.warning(
                "SQL aggregation failed for resource=%s year=%s, falling back to paged datastore search: %s",
                resource_id,
                year,
                type(exc).__name__,
            )

        records = self._fetch_records(
            resource_id=resource_id,
            filters={"Klasifikacija": "Izdevumi"},
            fields=["Gads", "Menesis_Atslega", "Menesis_nosaukums", "Ministrija_nosaukums", "Konsolidacija", "Summa"],
            page_size=1000,
            max_records=50000,
        )

        filtered: list[dict[str, Any]] = []
        latest_month = 0
        month_name_map: dict[int, str] = {}

        for record in records:
            raw_year = str(record.get("Gads", "")).strip()
            if raw_year != str(year):
                continue
            raw_month = str(record.get("Menesis_Atslega", "")).strip()
            if not raw_month.isdigit():
                continue
            month = int(raw_month)
            if month < 1 or month > 12:
                continue
            consolidation = str(record.get("Konsolidacija", "")).strip().lower()
            if "neto" not in consolidation or "transfert" not in consolidation:
                continue
            filtered.append(record)
            latest_month = max(latest_month, month)
            month_name_map[month] = str(record.get("Menesis_nosaukums", "")).strip()

        if latest_month == 0:
            return 1, "", {}

        aggregated: dict[str, float] = {}
        for record in filtered:
            month = int(str(record.get("Menesis_Atslega", "0")).strip() or "0")
            if month != latest_month:
                continue
            label = str(record.get("Ministrija_nosaukums", "")).strip()
            if not label:
                continue
            try:
                amount = float(record.get("Summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue
            aggregated[label] = aggregated.get(label, 0.0) + amount

        groups = {label: round(value / 1_000_000, 2) for label, value in aggregated.items() if value > 0}
        return latest_month, month_name_map.get(latest_month, ""), groups

    def _aggregate_year_for_resource_sql(
        self, resource_id: str, year: int
    ) -> tuple[int, str, dict[str, float]]:
        sql = (
            f'SELECT "Menesis_Atslega", "Menesis_nosaukums", "Ministrija_nosaukums", SUM("Summa") as summa '
            f'FROM "{resource_id}" '
            "WHERE "
            "\"Klasifikacija\" = 'Izdevumi' "
            "AND \"Konsolidacija\" = 'Visu resoru NETO - bez transfertiem' "
            f"AND \"Gads\" = '{year}' "
            'GROUP BY "Menesis_Atslega", "Menesis_nosaukums", "Ministrija_nosaukums"'
        )
        rows = self._sql_records(sql)
        if not rows:
            return 1, "", {}

        latest_month = 0
        month_name = ""
        for row in rows:
            raw_month = str(row.get("Menesis_Atslega", "")).strip()
            if not raw_month.isdigit():
                continue
            month = int(raw_month)
            if month > latest_month:
                latest_month = month
                month_name = str(row.get("Menesis_nosaukums", "")).strip()

        if latest_month == 0:
            return 1, "", {}

        aggregated: dict[str, float] = {}
        for row in rows:
            raw_month = str(row.get("Menesis_Atslega", "")).strip()
            if not raw_month.isdigit() or int(raw_month) != latest_month:
                continue
            label = str(row.get("Ministrija_nosaukums", "")).strip()
            if not label:
                continue
            try:
                amount = float(row.get("summa", 0.0) or 0.0)
            except (TypeError, ValueError):
                continue
            aggregated[label] = aggregated.get(label, 0.0) + amount

        groups = {label: round(value / 1_000_000, 2) for label, value in aggregated.items() if value > 0}
        return latest_month, month_name, groups

    def _normalize_rows(
        self, rows: list[tuple[str, float]], total_expenditure_eur_m: float, limit: int
    ) -> list[BudgetVoteDivision]:
        out: list[BudgetVoteDivision] = []
        used_ids: set[str] = set()

        for index, (label, amount_eur_m) in enumerate(rows[:limit]):
            share = round((amount_eur_m / total_expenditure_eur_m) * 100, 2)
            item_id = self._slugify(label)
            if item_id in used_ids:
                item_id = f"{item_id}_{index + 1}"
            used_ids.add(item_id)

            out.append(
                BudgetVoteDivision(
                    id=item_id,
                    label=label,
                    vote_division=label,
                    amount_eur_m=amount_eur_m,
                    share_pct=share,
                    cents_from_euro=share,
                )
            )
        return out

    def _fetch_records(
        self,
        resource_id: str,
        filters: Optional[dict[str, str]],
        fields: list[str],
        page_size: int,
        max_records: int,
    ) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        offset = 0
        while offset < max_records:
            payload = self._api_action(
                "datastore_search",
                {
                    "resource_id": resource_id,
                    "limit": page_size,
                    "offset": offset,
                    "fields": fields,
                    **({"filters": filters} if filters else {}),
                },
            )
            page = payload.get("records", [])
            if not isinstance(page, list) or not page:
                break
            records.extend(page)
            if len(page) < page_size:
                break
            offset += page_size
        return records[:max_records]

    def _sql_records(self, sql: str) -> list[dict[str, Any]]:
        payload = self._api_action("datastore_search_sql", {"sql": sql})
        records = payload.get("records", [])
        if not isinstance(records, list):
            return []
        return records

    def _api_action(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/{action}"
        response = self._http.post(url, json=params)
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success", False):
            raise RuntimeError(f"CKAN action '{action}' failed: {payload}")
        result = payload.get("result")
        if not isinstance(result, dict):
            raise RuntimeError(f"CKAN action '{action}' returned unexpected result payload.")
        return result

    def _cache_get(
        self, cache_key: tuple[Optional[int], Optional[int], int]
    ) -> Optional[BudgetVoteDivisionSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._cache.pop(cache_key, None)
                return None
            return snapshot

    def _cache_set(
        self, cache_key: tuple[Optional[int], Optional[int], int], snapshot: BudgetVoteDivisionSnapshot
    ) -> None:
        with self._cache_lock:
            self._cache[cache_key] = (time(), snapshot)

    def _history_cache_get(
        self, cache_key: tuple[int, Optional[str], int]
    ) -> Optional[BudgetVoteDivisionHistorySnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._history_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._history_cache.pop(cache_key, None)
                return None
            return snapshot

    def _history_cache_set(
        self,
        cache_key: tuple[int, Optional[str], int],
        snapshot: BudgetVoteDivisionHistorySnapshot,
    ) -> None:
        with self._cache_lock:
            self._history_cache[cache_key] = (time(), snapshot)

    def _revenue_history_cache_get(
        self, cache_key: tuple[int, Optional[int]]
    ) -> Optional[BudgetRevenueSourcesHistorySnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._revenue_history_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._revenue_history_cache.pop(cache_key, None)
                return None
            return snapshot

    def _revenue_history_cache_set(
        self,
        cache_key: tuple[int, Optional[int]],
        snapshot: BudgetRevenueSourcesHistorySnapshot,
    ) -> None:
        with self._cache_lock:
            self._revenue_history_cache[cache_key] = (time(), snapshot)

    def _trade_overview_cache_get(
        self, cache_key: tuple[int, Optional[int], int]
    ) -> Optional[TradeOverviewSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._trade_overview_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._trade_overview_cache.pop(cache_key, None)
                return None
            return snapshot

    def _trade_overview_cache_set(
        self,
        cache_key: tuple[int, Optional[int], int],
        snapshot: TradeOverviewSnapshot,
    ) -> None:
        with self._cache_lock:
            self._trade_overview_cache[cache_key] = (time(), snapshot)

    def _economy_structure_cache_get(
        self, cache_key: tuple[int, Optional[int]]
    ) -> Optional[EconomyStructureSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._economy_structure_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._economy_structure_cache.pop(cache_key, None)
                return None
            return snapshot

    def _economy_structure_cache_set(
        self,
        cache_key: tuple[int, Optional[int]],
        snapshot: EconomyStructureSnapshot,
    ) -> None:
        with self._cache_lock:
            self._economy_structure_cache[cache_key] = (time(), snapshot)

    def _expenditure_positions_cache_get(
        self,
        cache_key: tuple[Optional[int], Optional[int], str, int],
    ) -> Optional[BudgetExpenditurePositionsSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._expenditure_positions_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._expenditure_positions_cache.pop(cache_key, None)
                return None
            return snapshot

    def _expenditure_positions_cache_set(
        self,
        cache_key: tuple[Optional[int], Optional[int], str, int],
        snapshot: BudgetExpenditurePositionsSnapshot,
    ) -> None:
        with self._cache_lock:
            self._expenditure_positions_cache[cache_key] = (time(), snapshot)

    def _procurement_kpi_cache_get(
        self,
        cache_key: tuple[Optional[int], Optional[int], int],
    ) -> Optional[BudgetProcurementKpiSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._procurement_kpi_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._procurement_kpi_cache.pop(cache_key, None)
                return None
            return snapshot

    def _procurement_kpi_cache_set(
        self,
        cache_key: tuple[Optional[int], Optional[int], int],
        snapshot: BudgetProcurementKpiSnapshot,
    ) -> None:
        with self._cache_lock:
            self._procurement_kpi_cache[cache_key] = (time(), snapshot)

    def _external_debt_overview_cache_get(
        self,
        cache_key: tuple[int, Optional[int]],
    ) -> Optional[ExternalDebtOverviewSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._external_debt_overview_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._external_debt_overview_cache.pop(cache_key, None)
                return None
            return snapshot

    def _external_debt_overview_cache_set(
        self,
        cache_key: tuple[int, Optional[int]],
        snapshot: ExternalDebtOverviewSnapshot,
    ) -> None:
        with self._cache_lock:
            self._external_debt_overview_cache[cache_key] = (time(), snapshot)

    def _construction_overview_cache_get(
        self,
        cache_key: tuple[int, Optional[int]],
    ) -> Optional[ConstructionOverviewSnapshot]:
        now = time()
        with self._cache_lock:
            entry = self._construction_overview_cache.get(cache_key)
            if entry is None:
                return None
            cached_at, snapshot = entry
            if now - cached_at > self.cache_ttl_sec:
                self._construction_overview_cache.pop(cache_key, None)
                return None
            return snapshot

    def _construction_overview_cache_set(
        self,
        cache_key: tuple[int, Optional[int]],
        snapshot: ConstructionOverviewSnapshot,
    ) -> None:
        with self._cache_lock:
            self._construction_overview_cache[cache_key] = (time(), snapshot)

    def _resolve_resource_fields(self, resource_id: str) -> set[str]:
        now = time()
        with self._cache_lock:
            entry = self._resource_fields_cache.get(resource_id)
            if entry is not None and now - entry[0] <= self.cache_ttl_sec:
                return set(entry[1])

        try:
            payload = self._api_action("datastore_info", {"id": resource_id})
            fields_raw = payload.get("fields", [])
            field_names = {
                str(item.get("id", "")).strip()
                for item in fields_raw
                if isinstance(item, dict) and str(item.get("id", "")).strip()
            }
        except Exception:
            field_names = set()

        with self._cache_lock:
            self._resource_fields_cache[resource_id] = (now, set(field_names))
        return field_names

    def _resolve_available_years(self, resource_id: str) -> list[int]:
        now = time()
        with self._cache_lock:
            entry = self._resource_years_cache.get(resource_id)
            if entry is not None and now - entry[0] <= self.cache_ttl_sec:
                return list(entry[1])

        rows = self._fetch_records(
            resource_id=resource_id,
            filters=None,
            fields=["Gads"],
            page_size=3000,
            max_records=400000,
        )
        years = sorted(
            {
                int(str(row.get("Gads", "")).strip())
                for row in rows
                if str(row.get("Gads", "")).strip().isdigit()
            }
        )

        with self._cache_lock:
            self._resource_years_cache[resource_id] = (now, list(years))
        return years

    def _first_available_field(self, available_fields: set[str], candidates: list[str]) -> Optional[str]:
        for field in candidates:
            if field in available_fields:
                return field
        return None

    def _slugify(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
        return slug[:48] or "division"

    def _normalize_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii").lower()
        return re.sub(r"\s+", " ", normalized).strip()

    def _classify_revenue_source(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii").lower()
        normalized = re.sub(r"\s+", " ", normalized).strip()

        if "pievienotas vertibas nodok" in normalized or " pvn" in normalized:
            return "pvn"
        if "iedzivotaju ienakuma nodok" in normalized or " iin" in normalized:
            return "iin"
        if "uznemumu ienakuma nodok" in normalized or " uin" in normalized:
            return "uzn_ien"
        if "akcizes nodok" in normalized:
            return "akcizes"
        if "socialas apdrosinasanas" in normalized or "socialas iemaks" in normalized:
            return "soc_apdr"
        if "solidaritates nodok" in normalized:
            return "soc_apdr"
        if "nekustama ipasuma nodok" in normalized:
            return "nekust_ipas"
        if "muitas nodok" in normalized or "ievedmuitas" in normalized:
            return "customs"
        if "dabas resursu nodok" in normalized:
            return "dab_resursi"
        if (
            "eiropas savienib" in normalized
            or "ienemumi no eiropas" in normalized
            or ("eiropas " in normalized and " fond" in normalized)
            or "es fondu" in normalized
            or "strukturfond" in normalized
            or "arvalstu finansu palidzib" in normalized
        ):
            return "eu_funds"
        if "aiznem" in normalized or "parada vertspap" in normalized:
            return "borrowing"
        return "other_rev"

    def _detail_label_from_record(self, record: dict[str, Any]) -> str:
        for key in ("Likuma_griezuma_EKK", "Vienotais_EKK_Nosaukums_8_limenis", "Projekts_nosaukums"):
            value = str(record.get(key, "")).strip()
            if value:
                return value
        return "Cits ieņēmumu postenis"

    def _extract_year_from_resource(self, resource: dict[str, Any]) -> Optional[int]:
        search_blobs = [
            str(resource.get("url", "")),
            str(resource.get("name", "")),
            str(resource.get("description", "")),
        ]
        for blob in search_blobs:
            years = re.findall(r"\b(?:19|20)\d{2}\b", blob)
            if not years:
                continue
            # Prefer the last detected year in url/name.
            try:
                return int(years[-1])
            except ValueError:
                continue
        return None

    def _resolve_selected_group_label(
        self, group: Optional[str], available_groups: list[BudgetVoteDivisionGroupSummary]
    ) -> str:
        if not group:
            return available_groups[0].label
        normalized = group.strip().lower()
        for item in available_groups:
            if item.label.lower() == normalized or item.id == normalized:
                return item.label
        return available_groups[0].label
