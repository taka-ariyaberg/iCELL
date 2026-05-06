# Repository structure

Single source of truth for "where does X go?". When adding a new file, find the right directory below — if nothing fits, propose a new one in your PR rather than dumping at the root.

## Top-level layout

```
iCELL/
├── backend/            FastAPI wrapper around the Python engine
├── config/             Per-run configuration: template, JSON Schema, plate types
├── data/
│   ├── examples/       End-to-end runnable scenarios
│   ├── input/          Where users place their three CSV inputs
│   ├── output/         Generated CSVs, instructions, logs (gitignored)
│   └── templates/      Empty header-only CSVs to copy from
├── docs/               Human-facing project documentation
├── frontend/           React + TypeScript + Vite single-page app
├── notebooks/          Jupyter entry point (run.ipynb) for the file-driven workflow
├── scripts/            Project-wide shell scripts (start.sh)
├── src/icell/          Python calculation engine — single source of truth
└── tests/              Backend (engine + service) unittest suite
```

Repo-root files are **only** community/release files (LICENSE, README, CONTRIBUTING, CITATION, SECURITY, CODE_OF_CONDUCT, CHANGELOG) plus build descriptors (Dockerfile, docker-compose.yml, pyproject.toml, .python-version, .nvmrc, .editorconfig, .gitignore, .pre-commit-config.yaml). Everything else lives in a subdirectory.

## `frontend/src/` layout

```
frontend/src/
├── App.tsx             Top-level router
├── main.tsx            Vite entry point
├── components/         Cross-page reusable components
│   ├── inputs/         Generic input controls — NumberInput, ViewModeSwitch
│   ├── plate/          Plate-grid components — PlateVisualization, PlateLegend
│   ├── primitives/     Tiny "define-once" primitives — Unit, MetricRow,
│   │                   DetailCardHeader, PlateNavigationChip, FormattedVolume
│   ├── protocol/       Protocol Navigator components — ProtocolSection,
│   │                   ProtocolDetailCard, protocolTypes
│   └── CSVUploader.tsx Top-level uploader (used only by App)
├── pages/              Page-level components, one subdir per page
│   ├── design/         DesignPage + 16 panel/modal/hook companions
│   └── results/        ResultsPage + ResultsDisplay
├── services/           Network layer — apiClient
├── store/              Zustand stores — plateStore + tests
├── styles/             Centralized stylesheets (one .css per major component)
└── utils/              Pure-function utilities
    ├── export/         File-export pipeline (CSV, SVG, PNG, download trigger)
    ├── csvExport.ts    Generic CSV row serializer (used in 2+ places)
    ├── importUtils.ts  Reverse-direction: backend response → frontend session
    ├── plateLayout.ts  → moved into utils/export/ (used only by exporters)
    ├── protocolInstructions.ts  Parse the engine's instruction text
    ├── wellHoverDetails.ts      Build per-well hover lines (results page)
    └── wellRange.ts             Rectangular well-range helper (results page)
```

### Why these groupings

- **`components/`**: subdirectory only when a domain has 2+ files (`plate/`, `protocol/`, `inputs/`, `primitives/`). Single-file domains stay at top level (`CSVUploader.tsx`).
- **`pages/`**: every page gets its own directory if it has supporting files, even if just one orchestrator + one component. The page is named after the directory (`pages/design/DesignPage.tsx`, `pages/results/ResultsPage.tsx`).
- **`pages/design/`**: 17 files implementing the Design page — orchestrator, 4 panels, 6 modals, 1 shared sub-form, 2 hooks, types. Co-located so changes to the page are local to one directory.
- **`pages/results/`**: orchestrator + the `ResultsDisplay` component (only consumer is `ResultsPage`).
- **`utils/export/`**: 8 files that form one pipeline (input CSVs, SVG plate, PNG plate, file download). The 5 remaining utils stay at top level — none are 8+ flat siblings.

### CSS strategy — central, not co-located

Stylesheets live in `frontend/src/styles/`, **not** alongside the `.tsx` files that consume them. Reasoning: most pages share styles (e.g. `.detail-card-header`, `.modal-overlay`, `.form-group`) and inlining one file's CSS makes those cross-references invisible. The roadmap's Phase 11.4 considered CSS Modules co-located per component, but the cross-referencing won out. If a stylesheet is exclusively used by one component, it still lives in `styles/` — keeping the directory uniform is more valuable than the technical co-location win.

## `src/icell/` layout (Python engine)

```
src/icell/
├── __init__.py            Public surface: run_pipeline, run_icell, __version__
├── main.py                Lower-level entry point used by the backend service
├── pipeline.py            Notebook entry point: run_pipeline()
├── paths.py               Path constants
├── config/                Config + plate-type loading
├── io/                    CSV readers
├── models/                (reserved)
├── processing/            Calculation: seeding, dye_mastermix, layout_parser, validation
├── reporting/             Output generation: formatted_exports, imeta, instructions, …
└── utils/                 (reserved)
```

`__init__.py` declares `__all__`; the notebook contract `from icell.pipeline import run_pipeline` is frozen.

## `backend/` layout

```
backend/
├── app.py                 FastAPI app entry point
├── api/
│   ├── routes.py          HTTP endpoints
│   └── schemas.py         Pydantic request/response models
└── services/
    └── icell_service.py   Bridge between API schemas and the engine
```

## Adding new files — quick rules

| Adding... | Goes in |
|---|---|
| A new page | `frontend/src/pages/<name>/<Name>Page.tsx` (create the dir even if just one file at first) |
| A page-specific component | `frontend/src/pages/<page>/<Component>.tsx` |
| A reusable component used by 2+ pages | `frontend/src/components/<domain>/<Name>.tsx` |
| A tiny "called many times" primitive | `frontend/src/components/primitives/<Name>.tsx` |
| A page-specific hook | `frontend/src/pages/<page>/use<Name>.ts` |
| A pure data transformation | `frontend/src/utils/<name>.ts` (or `utils/export/` if part of the export pipeline) |
| A new engine algorithm | `src/icell/processing/<name>.py` |
| A new export format | `src/icell/reporting/<name>.py` |
| A backend route | `backend/api/routes.py` (or split if the file is growing past 300 LOC) |
| Documentation | `docs/<name>.md` |