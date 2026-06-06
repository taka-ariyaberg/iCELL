# iCELL architecture

A high-level map of how iCELL's pieces fit together. Read this first if you're trying to understand where a behavior lives.

## One engine behind the web app

```
                       ┌──────────────────────────────────────┐
                       │   src/icell/   (Python engine)       │
                       │                                      │
                       │   config/  →  loader.py              │
                       │   processing/  → seeding, dyes       │
                       │   reporting/   → CSVs, instructions  │
                       │   main.py  → run_icell()             │
                       └──────────────────────────────────────┘
                                              ▲
                                              │
                                  ┌─────────────────────────┐
                                  │   backend/  (FastAPI)   │
                                  │                         │
                                  │   api/routes.py         │
                                  │   api/schemas.py        │
                                  │   services/icell_*.py   │
                                  └─────────────────────────┘
                                              ▲
                                              │
                                  ┌──────────────────────────────┐
                                  │   frontend/  (React)         │
                                  │                              │
                                  │   pages/design/DesignPage    │
                                  │   pages/results/ResultsPage  │
                                  │   services/apiClient.ts      │
                                  │   store/plateStore.ts        │
                                  └──────────────────────────────┘
                                              ▲
                                              │
                                     user's browser
```

**Single source of truth:** all calculation logic lives in `src/icell/`. The FastAPI backend calls into it. Adding or fixing a calculation means editing one file under `src/icell/processing/` or `src/icell/reporting/`; the change flows through to the web app.

## Layer responsibilities

| Layer | Lives in | Responsibility |
|---|---|---|
| **Engine** | `src/icell/` | Pure calculation. Reads config + CSV inputs; produces in-memory tables and writes output files. No web concerns. |
| **Backend** | `backend/` | FastAPI app. Translates browser-shaped requests into engine-shaped calls. Exposes `/api/health`, `/api/run`, `/api/upload-csv`. |
| **Frontend** | `frontend/` | React + TypeScript single-page app. Uses Zustand for state, axios for API calls. Vite builds it; the production build is copied into the Docker image. |

## Request flow — Web UI

1. User edits the plate in `frontend/src/pages/design/DesignPage.tsx`. State lives in `frontend/src/store/plateStore.ts` (Zustand).
2. Clicking **Process** calls `apiClient.runCalculation(...)` (`frontend/src/services/apiClient.ts`).
3. The request hits `POST /api/run` (`backend/api/routes.py`). Pydantic models (`backend/api/schemas.py`) validate the payload.
4. The route calls `backend/services/icell_service.py` which translates the schema-shaped input into the config dict shape the engine expects, writes temporary CSVs, and calls `run_icell()` from `src/icell/main.py`.
5. The engine produces the seeding summary, dye summary, iMETA rows, formatted summary, and instructions. The service serializes them into JSON-safe records and returns them.
6. The frontend receives the response, stores it, and renders `pages/results/ResultsPage.tsx` plus the `components/protocol/ProtocolSection.tsx` navigator.

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

| File | Purpose | Reference |
|---|---|---|
| `config/plate_type/*.json` | Plate dimension definitions | [`config/plate_type/README.md`](../config/plate_type/README.md) |
| `data/input/cell_layout.csv` | Per-well cell density matrix | — |
| `data/input/dye_layout.csv` | Per-well dye program assignment matrix | — |
| `data/input/meta_dye.csv` | Dye program → component recipes | — |

Per-run parameters (plate type, seeding mode, volumes) come from the web app and are translated into the engine's config shape by `backend/services/icell_service.py`.

## Why the layering matters

iCELL deliberately keeps calculation logic out of the web/UI layer. That means:

- A bug fix in seeding math is one PR that benefits the whole app.
- The backend doesn't reimplement anything; it adapts shapes and routes I/O.
- Tests target `src/icell/` directly without spinning up FastAPI.

If you find yourself writing calculation logic in `backend/` or `frontend/`, that's a smell — it belongs in the engine.