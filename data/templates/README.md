# Input templates

Empty header-only CSVs for the three input files iCELL consumes. Copy a template into `data/input/` (with the exact filename listed below) and fill it in.

| Template | Copy to | Format |
|---|---|---|
| [cell_layout_template.csv](cell_layout_template.csv) | `data/input/cell_layout.csv` | Plate-shaped matrix. First column is `row_name` (`A`, `B`, …); each subsequent column is a 1-indexed plate column. Each cell holds the cell-density value for that well, or is left blank for "no cells in this well". |
| [dye_layout_template.csv](dye_layout_template.csv) | `data/input/dye_layout.csv` | Plate-shaped matrix with the same row/column convention. Each cell holds the **dye program name** for that well (e.g. `CP_A`, `CP_B`) — must match a `dye_program` from `meta_dye.csv`. Blank = no dye in that well. |
| [meta_dye_template.csv](meta_dye_template.csv) | `data/input/meta_dye.csv` | Tabular. One row per (dye_program, dye_name) pair. Columns: `dye_program`, `dye_name`, `stock_concentration`, `stock_concentration_unit`, `final_concentration`, `final_concentration_unit`. |

## Sizing

The provided templates contain 16 rows (A–P) × 24 columns, which covers every plate type up to 384-well. For 1536-well plates, extend the rows to A–AF (or use the engine's plate-type definitions to drive layout). Smaller plates (96-well, 24-well, 6-well, etc.) ignore extra rows/columns automatically — leave the trailing rows blank.

## Worked examples

See [data/examples/](../examples) for filled-in versions you can run end to end:

- `simple_seeding/` — cells only, no dye.
- `with_dye/` — cells plus a dye program.

## After filling in

1. Place your three CSVs in `data/input/` with the exact filenames above.
2. Make sure `config/config.json` exists (copy from [`config/config.template.json`](../../config/config.template.json) if not).
3. Start iCELL: `bash scripts/start.sh`.
4. Either open the notebook (`http://localhost:8888/lab?token=icell` → `notebooks/run.ipynb`) or upload the CSVs through the web UI at `http://localhost:8000`.