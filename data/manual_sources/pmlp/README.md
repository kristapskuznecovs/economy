## PMLP Manual Sources

This folder stores source files downloaded manually from the PMLP portal when the same data is not available through a stable public API or `data.gov.lv` dataset.

Source page:

- https://www.pmlp.gov.lv/lv/statistika-uzturesanas-atlaujas-2025-gads

Current contents:

- 2025 residence permit statistics (`TUA` and `PUA`)
- manifest for the 2025 PMLP source page and attachment titles
- downloader script for the full `2020-2025` archive

Known limitation in this environment:

- The direct PMLP attachment endpoints timed out during automated download attempts from the shell.
- If needed, download the files manually from the source page into this folder and keep the local names aligned with `manifest.json`.

Downloader:

```bash
python3 data/manual_sources/pmlp/download_pmlp_permit_stats.py
```

Expected output layout:

- `data/manual_sources/pmlp/2020/`
- `data/manual_sources/pmlp/2021/`
- `data/manual_sources/pmlp/2022/`
- `data/manual_sources/pmlp/2023/`
- `data/manual_sources/pmlp/2024/`
- `data/manual_sources/pmlp/2025/`

Rules:

- Keep original source files unchanged.
- Prefer stable local filenames that include source, year, and metric.
- Add or update `manifest.json` when files are downloaded or refreshed.
