"""Migration data API router: PMLP citizenship snapshots + World Bank net migration."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from .....adapters.outbound.external.migration_open_data import MigrationOpenDataClient
from .....application.dto import (
    CitizenshipEntryDTO,
    CitizenshipSnapshotDTO,
    ErrorResponseDTO,
    MigrationOverviewResponseDTO,
    MigrationTimeSeriesPointDTO,
)
from ..dependencies import get_migration_open_data_client

router = APIRouter(prefix="/api", tags=["migration"])
logger = logging.getLogger(__name__)

_COMMON_RESPONSES = {
    503: {"model": ErrorResponseDTO, "description": "Upstream data source unavailable."},
}


@router.get(
    "/migration/overview",
    response_model=MigrationOverviewResponseDTO,
    summary="Get Migration Overview",
    description=(
        "Return PMLP citizenship snapshots (time-series of registered residents by nationality) "
        "and World Bank net migration / migrant stock series for Latvia."
    ),
    responses=_COMMON_RESPONSES,
)
async def get_migration_overview(
    client: Annotated[MigrationOpenDataClient, Depends(get_migration_open_data_client)],
) -> MigrationOverviewResponseDTO:
    try:
        snap = client.get_overview()
    except Exception as exc:
        logger.exception("Failed loading migration overview")
        raise HTTPException(status_code=503, detail="Migration data source unavailable.") from exc

    def _map_citizenship_snapshot(s: object) -> CitizenshipSnapshotDTO:
        from .....adapters.outbound.external.migration_open_data import CitizenshipSnapshot
        assert isinstance(s, CitizenshipSnapshot)
        return CitizenshipSnapshotDTO(
            snapshot_date=s.snapshot_date,
            year=s.year,
            month=s.month,
            total_residents=s.total_residents,
            latvian_citizens=s.latvian_citizens,
            non_citizens_latvian=s.non_citizens_latvian,
            temp_protection=s.temp_protection,
            foreign_nationals=s.foreign_nationals,
            top_foreign=[
                CitizenshipEntryDTO(citizenship=e.citizenship, count=e.count)
                for e in s.top_foreign
            ],
        )

    return MigrationOverviewResponseDTO(
        latest_snapshot=_map_citizenship_snapshot(snap.latest_snapshot),
        citizenship_series=[_map_citizenship_snapshot(s) for s in snap.citizenship_series],
        wb_series=[
            MigrationTimeSeriesPointDTO(
                year=p.year,
                net_migration=p.net_migration,
                migrant_stock=p.migrant_stock,
            )
            for p in snap.wb_series
        ],
        source_pmlp_dataset_id=snap.source_pmlp_dataset_id,
        source_wb_country=snap.source_wb_country,
    )
