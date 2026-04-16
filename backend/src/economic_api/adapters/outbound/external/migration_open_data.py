"""Client for Latvia migration data: PMLP citizenship snapshots + World Bank net migration."""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from time import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

# PMLP dataset: "Latvijas iedzīvotāju sadalījums pēc valstiskās piederības"
# Each resource is a snapshot at a specific date. We maintain a curated list so we can
# serve a time-series without scraping the package metadata on every request.
# Format: (resource_id, snapshot_date_str)  date_str = YYYYMMDD
_PMLP_CITIZENSHIP_RESOURCES: list[tuple[str, str]] = [
    ("d850b6b6-b4c4-489b-8a32-8f2a68db4440", "20250701"),
    ("edd2e8c7-8cd7-44b6-8793-9cda78052e3c", "20250101"),
    ("51ada2fc-795f-4e38-ad38-dc6aae684bce", "20240701"),
    ("d75160c2-d2e9-476f-bea1-97ac7818b4ae", "20240101"),
    ("370e0dd9-920b-4497-9ad9-a1d95e917957", "20230701"),
    ("aecf1911-6f56-4202-9b6a-2dc12802698f", "20230101"),
    ("2b7d0959-e488-4c28-ac81-ac21fb8d7f2d", "20220701"),
    ("fd98e312-3167-49b0-ac03-70ce2e20df33", "20220107"),
    ("b24734b8-da07-4914-acee-249efec19b81", "20210630"),
    ("dcd5f444-9e98-42e3-86e6-22039a797b49", "20210101"),
    ("cca9e2f7-6c46-45b2-9110-945c3bdd71b1", "20200701"),
    ("e038222a-cc75-486c-814e-634162223e01", "20200101"),
    ("f512d19a-1a03-42ea-b80f-cb52b265c4f4", "20190701"),
]

# Citizenships that count as "Latvian" (not foreign)
_LATVIAN_STATUSES = {
    "LATVIJAS PILSONIS",
    "LATVIJAS NEPILSONIS",
    "LATVIJAS PAGAIDU AIZSARDZĪBA",  # Ukrainian war refugees with temp protection
}


@dataclass(frozen=True)
class CitizenshipEntry:
    citizenship: str
    count: int


@dataclass(frozen=True)
class CitizenshipSnapshot:
    snapshot_date: str  # YYYYMMDD
    year: int
    month: int
    total_residents: int
    latvian_citizens: int
    non_citizens_latvian: int  # nepilsoņi
    temp_protection: int       # pagaidu aizsardzība (Ukraine refugees)
    foreign_nationals: int     # all others
    top_foreign: list[CitizenshipEntry]  # top N by count, excl. Latvian statuses


@dataclass(frozen=True)
class MigrationTimeSeriesPoint:
    year: int
    net_migration: Optional[float]
    migrant_stock: Optional[float]


@dataclass(frozen=True)
class MigrationOverviewSnapshot:
    """Full migration overview: PMLP citizenship snapshots + WB net migration series."""
    # Latest citizenship breakdown
    latest_snapshot: CitizenshipSnapshot
    # All available snapshots (for time-series chart)
    citizenship_series: list[CitizenshipSnapshot]
    # World Bank net migration and stock series
    wb_series: list[MigrationTimeSeriesPoint]
    source_pmlp_dataset_id: str
    source_wb_country: str


class MigrationOpenDataClient:
    """Fetches migration data from PMLP (data.gov.lv) and World Bank."""

    PMLP_DATASET_ID = "0423467c-0a08-4b0c-b1e7-e18d45329fa8"

    def __init__(self) -> None:
        self.ckan_base = os.getenv(
            "BUDGET_CKAN_API_BASE", "https://data.gov.lv/dati/api/3/action"
        )
        self.world_bank_base = os.getenv(
            "WORLD_BANK_API_BASE", "https://api.worldbank.org/v2"
        )
        self.world_bank_country = os.getenv("WORLD_BANK_COUNTRY_CODE", "LVA")
        self.request_timeout_sec = float(os.getenv("MIGRATION_REQUEST_TIMEOUT_SEC", "10"))
        self.cache_ttl_sec = int(os.getenv("MIGRATION_CACHE_TTL_SEC", "21600"))  # 6h
        self.top_n = int(os.getenv("MIGRATION_TOP_N_NATIONALITIES", "15"))

        self._http = httpx.Client(timeout=self.request_timeout_sec)
        self._cache: Optional[tuple[float, MigrationOverviewSnapshot]] = None
        self._lock = threading.Lock()

    def get_overview(self) -> MigrationOverviewSnapshot:
        now = time()
        with self._lock:
            if self._cache is not None:
                cached_at, snapshot = self._cache
                if now - cached_at < self.cache_ttl_sec:
                    return snapshot

        snapshot = self._build_overview()
        with self._lock:
            self._cache = (time(), snapshot)
        return snapshot

    # ------------------------------------------------------------------
    # Internal builders
    # ------------------------------------------------------------------

    def _build_overview(self) -> MigrationOverviewSnapshot:
        citizenship_series = self._fetch_all_citizenship_snapshots()
        wb_series = self._fetch_wb_series()
        latest = citizenship_series[0] if citizenship_series else self._empty_snapshot("00000000")

        return MigrationOverviewSnapshot(
            latest_snapshot=latest,
            citizenship_series=citizenship_series,
            wb_series=wb_series,
            source_pmlp_dataset_id=self.PMLP_DATASET_ID,
            source_wb_country=self.world_bank_country,
        )

    def _fetch_all_citizenship_snapshots(self) -> list[CitizenshipSnapshot]:
        results: list[CitizenshipSnapshot] = []
        for resource_id, date_str in _PMLP_CITIZENSHIP_RESOURCES:
            try:
                snap = self._fetch_citizenship_snapshot(resource_id, date_str)
                if snap is not None:
                    results.append(snap)
            except Exception as exc:
                logger.warning(
                    "Skipping PMLP snapshot resource=%s date=%s: %s",
                    resource_id, date_str, exc,
                )
        return results

    def _fetch_citizenship_snapshot(
        self, resource_id: str, date_str: str
    ) -> Optional[CitizenshipSnapshot]:
        """Fetch one PMLP citizenship snapshot. Returns None if data unavailable."""
        records = self._ckan_datastore_search(resource_id, limit=300)
        if not records:
            return None

        # The field name changed between snapshots (some have trailing NBSP)
        # Normalise: find the citizenship field
        citizenship_field = None
        count_field = None
        if records:
            sample = records[0]
            for key in sample:
                norm = key.strip().replace("\xa0", "")
                if norm in ("Valstiska_piederiba", "Valstiskā piederība"):
                    citizenship_field = key
                elif norm == "Skaits":
                    count_field = key

        if citizenship_field is None or count_field is None:
            logger.warning("Cannot find expected fields in PMLP resource %s", resource_id)
            return None

        latvian_citizens = 0
        non_citizens_latvian = 0
        temp_protection = 0
        foreign_entries: list[CitizenshipEntry] = []
        total_residents = 0

        for rec in records:
            raw_citizenship = str(rec.get(citizenship_field, "")).strip().replace("\xa0", "").upper()
            try:
                count = int(rec.get(count_field, 0) or 0)
            except (ValueError, TypeError):
                count = 0
            total_residents += count

            if "LATVIJAS PILSONIS" in raw_citizenship and "NEPILSONIS" not in raw_citizenship:
                latvian_citizens += count
            elif "NEPILSONIS" in raw_citizenship:
                non_citizens_latvian += count
            elif "PAGAIDU AIZSARDZĪBA" in raw_citizenship or "PAGAIDU AIZSARDZIBA" in raw_citizenship:
                temp_protection += count
            elif raw_citizenship.startswith("LATVIJAS "):
                # LATVIJAS BĒGLIS, LATVIJAS ALTERNATĪVAIS, LATVIJAS BEZVALSTNIEKS —
                # all hold Latvian-issued protection/travel docs; not foreign nationals.
                non_citizens_latvian += count
            else:
                foreign_entries.append(CitizenshipEntry(citizenship=raw_citizenship, count=count))

        foreign_entries.sort(key=lambda e: e.count, reverse=True)
        foreign_nationals = sum(e.count for e in foreign_entries)

        year = int(date_str[:4])
        month = int(date_str[4:6])

        return CitizenshipSnapshot(
            snapshot_date=date_str,
            year=year,
            month=month,
            total_residents=total_residents,
            latvian_citizens=latvian_citizens,
            non_citizens_latvian=non_citizens_latvian,
            temp_protection=temp_protection,
            foreign_nationals=foreign_nationals,
            top_foreign=foreign_entries[: self.top_n],
        )

    def _empty_snapshot(self, date_str: str) -> CitizenshipSnapshot:
        return CitizenshipSnapshot(
            snapshot_date=date_str,
            year=int(date_str[:4]),
            month=int(date_str[4:6]),
            total_residents=0,
            latvian_citizens=0,
            non_citizens_latvian=0,
            temp_protection=0,
            foreign_nationals=0,
            top_foreign=[],
        )

    def _fetch_wb_series(self) -> list[MigrationTimeSeriesPoint]:
        net_migration = self._fetch_wb_indicator("SM.POP.NETM", start_year=2010, end_year=2025)
        migrant_stock = self._fetch_wb_indicator("SM.POP.TOTL", start_year=2010, end_year=2025)
        years = sorted(set(net_migration.keys()) | set(migrant_stock.keys()), reverse=True)
        return [
            MigrationTimeSeriesPoint(
                year=y,
                net_migration=net_migration.get(y),
                migrant_stock=migrant_stock.get(y),
            )
            for y in years
        ]

    def _fetch_wb_indicator(
        self, indicator: str, start_year: int, end_year: int
    ) -> dict[int, float]:
        url = f"{self.world_bank_base.rstrip('/')}/country/{self.world_bank_country}/indicator/{indicator}"
        try:
            response = self._http.get(
                url,
                params={
                    "format": "json",
                    "date": f"{start_year}:{end_year}",
                    "per_page": 100,
                },
                timeout=min(self.request_timeout_sec, 8.0),
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.warning("WB indicator fetch failed indicator=%s: %s", indicator, exc)
            return {}

        if not isinstance(payload, list) or len(payload) < 2:
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

    def _ckan_datastore_search(self, resource_id: str, limit: int = 300) -> list[dict[str, Any]]:
        url = f"{self.ckan_base.rstrip('/')}/datastore_search"
        try:
            response = self._http.post(
                url,
                json={"resource_id": resource_id, "limit": limit},
                timeout=self.request_timeout_sec,
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.warning("CKAN datastore_search failed resource=%s: %s", resource_id, exc)
            return []
        if not payload.get("success", False):
            return []
        return payload.get("result", {}).get("records", [])
