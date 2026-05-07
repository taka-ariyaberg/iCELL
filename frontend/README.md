# iCELL Frontend

React + TypeScript + Vite single-page app that talks to the FastAPI backend. The interactive plate designer and results page; same calculation engine as the notebook workflow (`src/icell/`).

## Setup

Don't run anything from this directory. The whole stack starts together:

```bash
bash scripts/start.sh
```

See the top-level [README](../README.md).

## Where things live

The full directory map is in [`docs/repo-structure.md`](../docs/repo-structure.md). Within `frontend/src/`:

- `pages/` — one subdirectory per page (`design/`, `results/`)
- `components/` — domain-grouped reusables (`plate/`, `protocol/`, `inputs/`, `primitives/`)
- `services/apiClient.ts` — single integration point for backend requests
- `store/plateStore.ts` — Zustand store for interactive plate state and undo/redo
- `utils/` — pure helpers, with `utils/export/` for the CSV/SVG/PNG export pipeline
- `styles/` — centralized stylesheets

## Environment variables

Frontend-specific config (also in [`.env.example`](.env.example)):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API base URL |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Alias for `VITE_API_URL` |
| `VITE_ENV` | `development` | Application environment label |

If neither `VITE_API_URL` nor `VITE_API_BASE_URL` is set, the frontend defaults to `http://localhost:8000/api`.

## Development principles

- Calculation logic stays in the Python engine (`src/icell/`) — never duplicated here.
- All backend access goes through `services/apiClient.ts`.
- Interactive plate state lives in the Zustand store, not in prop chains.
- See [`docs/architecture.md`](../docs/architecture.md) for the layered request flow.