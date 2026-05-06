# iCELL architecture

A high-level map of how iCELL's pieces fit together. Read this first if you're contributing or just trying to understand where a behavior lives.

## One engine, two surfaces

```
                       ┌──────────────────────────────────────┐
                       │   src/icell/   (Python engine)       │
                       │                                      │
                       │   config/  →  loader.py              │
                       │   processing/  → seeding, dyes       │
                       │   reporting/   → CSVs, instructions  │
                       │   pipeline.py  → run_pipeline()      │
                       └──────────────────────────────────────┘
                              ▲                       ▲
                              │                       │
              ┌───────────────┘                       └───────────────┐
              │                                                       │
   ┌──────────────────────────┐                          ┌─────────────────────────┐
   │   notebooks/run.ipynb    │                          │   backend/  (FastAPI)   │
   │                          │                          │                         │
   │   from icell.pipeline    │                          │   api/routes.py         │
   │   import run_pipeline    │                          │   api/schemas.py        │
   │   results = run_pipeline │                          │   services/icell_*.py   │
   └──────────────────────────┘                          └─────────────────────────┘
              ▲                                                       ▲
              │                                                       │
   ┌──────────────────────────┐                          ┌──────────────────────────────┐
   │   config/config.json     │                          │   frontend/  (React)         │
   │   data/input/*.csv       │                          │                              │
   └──────────────────────────┘                          │   pages/design/DesignPage    │
                                                         │   pages/results/ResultsPage  │
                                                         │   services/apiClient.ts      │
                                                         │   store/plateStore.ts        │
                                                         └──────────────────────────────┘
                                                                     ▲
                                                                     │
                                                            user's browser
```

**Single source of truth:** all calculation logic lives in `src/icell/`. Both the notebook and the FastAPI backend call into it. Adding or fixing a calculation means editing one file under `src/icell/processing/` or `src/icell/reporting/`; both surfaces inherit the change.

## Layer responsibilities

| Layer | Lives in | Responsibility |
|---|---|---|
| **Engine** | `src/icell/` | Pure calculation. Reads config + CSV inputs; produces in-memory tables and writes output files. No web concerns. |
| **Notebook** | `notebooks/run.ipynb` | Thin wrapper that calls `run_pipeline()`. Inputs come from `config/config.json` and `data/input/`. |
| **Backend** | `backend/` | FastAPI app. Translates browser-shaped requests into engine-shaped calls. Exposes `/api/health`, `/api/run`, `/api/upload-csv`. |
| **Frontend** | `frontend/` | React + TypeScript single-page app. Uses Zustand for state, axios for API calls. Vite builds it; the production build is copied into the Docker image. |

## Request flow — Web UI

1. User edits the plate in `frontend/src/pages/design/DesignPage.tsx`. State lives in `frontend/src/store/plateStore.ts` (Zustand).
2. Clicking **Process** calls `apiClient.runCalculation(...)` (`frontend/src/services/apiClient.ts`).
3. The request hits `POST /api/run` (`backend/api/routes.py`). Pydantic models (`backend/api/schemas.py`) validate the payload.
4. The route calls `backend/services/icell_service.py` which translates the schema-shaped input into the config dict shape the engine expects, writes temporary CSVs, and calls `run_icell()` from `src/icell/main.py`.
5. The engine produces the seeding summary, dye summary, iMETA rows, formatted summary, and instructions. The service serializes them into JSON-safe records and returns them.
6. The frontend receives the response, stores it, and renders `pages/results/ResultsPage.tsx` plus the `components/protocol/ProtocolSection.tsx` navigator.

## Request flow — Notebook

1. User edits `config/config.json` and the three CSVs in `data/input/`.
2. Opens `notebooks/run.ipynb` in JupyterLab and runs the cells.
3. The notebook does only this:
   ```python
   from icell.pipeline import run_pipeline
   results = run_pipeline()
   ```
4. `run_pipeline` reads the config, runs the same engine code, writes output files to `data/output/`, and returns a results object the notebook can display.

## Outputs

Engine outputs land in `data/output/`:

```
data/output/
├── tables/
│   ├── iCELL_<project>_<plate-id>_<timestamp>_seeding_summary.csv
│   ├── iCELL_<project>_<plate-id>_<timestamp>_dye_program_summary.csv
│   ├── iCELL_<project>_<plate-id>_<timestamp>_iMETA.csv
│   └── ...
├── instructions/
│   └── iCELL_<...>_instructions.txt
└── logs/
    └── iCELL_<...>_run.log
```

Filenames use the format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, built by `src/icell/reporting/file_names.py`. The `iCELL_..._iMETA.csv` and `iCELL_..._cell_seeding.csv` files are public contracts consumed by **iMETA** downstream — do not change those names without a coordinated migration.

## Configuration

| File | Purpose | Schema |
|---|---|---|
| `config/config.json` | Per-run parameters (plate type, seeding mode, volumes, paths) | [`config/config.schema.json`](../config/config.schema.json) |
| `config/plate_type/*.json` | Plate dimension definitions | [`config/plate_type/README.md`](../config/plate_type/README.md) |
| `data/input/cell_layout.csv` | Per-well cell density matrix | [`data/templates/README.md`](../data/templates/README.md) |
| `data/input/dye_layout.csv` | Per-well dye program assignment matrix | same |
| `data/input/meta_dye.csv` | Dye program → component recipes | same |

## Why the layering matters

iCELL deliberately keeps calculation logic out of the web/UI layer. That means:

- A bug fix in seeding math is one PR that benefits both surfaces.
- The notebook stays lightweight — it's literally three lines that call into the engine.
- The backend doesn't reimplement anything; it adapts shapes and routes I/O.
- Tests target `src/icell/` directly without spinning up FastAPI.

If you find yourself writing calculation logic in `backend/` or `frontend/`, that's a smell — it belongs in the engine.