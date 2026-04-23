# Frontend Developer Guide

## Prerequisites

- Docker with Compose support

## Local Development

Bootstrap the repo with the top-level [README.md](../README.md) first. That file is the canonical setup guide for the supported Docker workflow.

Once the repo is bootstrapped locally, the usual frontend development loop is:

```bash
bash scripts/start.sh
```

Run that command from the repo root. It builds the app image, starts the backend-plus-frontend container, and starts the notebook container.

## Current Frontend Pages

- `DesignPage.tsx` for interactive plate design, `Plate ID`, and seeding-date setup
- `ResultsPage.tsx` for processed results, export review, and the protocol navigator

## Current Upload Flow

- `App.tsx` owns the mode switch between design and file import
- `CSVUploader.tsx` handles uploaded config and CSV inputs

## Folder Roles

### `src/pages`

Top-level views. Keep page files focused on orchestration, layout, and high-level event handling.

### `src/components`

Reusable pieces used by pages. Shared presentation and interaction logic belongs here.

Important current components:

- `PlateVisualization.tsx` for the shared plate grid used across design and results views
- `ProtocolSection.tsx` for the results-page protocol navigator and instruction cards
- `ResultsDisplay.tsx` for seeding and dye summary viewers plus CSV downloads

### `src/store`

Zustand state, including well assignments, group definitions, dye assignments, selections, and undo/redo history.

### `src/services`

HTTP integration only. Backend access should stay centralized in `apiClient.ts`.

### `src/utils`

Pure helpers and export logic.

### `src/styles`

Styling files for pages and shared components.

## Working Rules

- Keep calculation logic in the Python engine where possible
- Avoid duplicating backend rules in the frontend
- Route all backend requests through `src/services/apiClient.ts`
- Preserve the existing notebook and config workflow when changing shared behavior
- Keep undo/redo changes atomic in the store
- Keep result-page toggles, legends, and plate layouts visually consistent with the shared plate-viewer patterns

## Common Changes

### Add store state

1. Extend the store interface in `src/store/plateStore.ts`
2. Add the state and action implementation in the same file
3. Consume it from pages or components via `usePlateStore()`

### Add an API call

1. Add a typed function in `src/services/apiClient.ts`
2. Call it from the page or component that owns the flow
3. Keep request and response types explicit

### Add a new view

1. Create the page in `src/pages`
2. Connect it in `src/App.tsx`
3. Add any shared UI in `src/components`
4. Add matching styles only where needed

## Debugging

Backend health:

```bash
curl http://localhost:8000/api/health
```

Useful targets:

- `http://localhost:8000/docs`
- `docker compose ps`
- `docker compose logs -f app`
- `docker compose run --rm app python -m unittest discover -s tests`
- browser devtools

## Environment

Supported variables:

- `VITE_API_URL`
- `VITE_API_BASE_URL`

Fallback: `http://localhost:8000/api`

### Frontend build failures
- Rebuild the app image with `docker compose build app`
- The frontend production build runs inside the Docker image build, so TypeScript and bundling failures surface there

## Best Practices

1. **Keep components small** - max 300 lines per file
2. **Use Zustand hooks** - never prop-drill through 3+ levels
3. **Separate concerns** - UI logic separate from business logic
4. **Comment complex logic** - especially in utils and store
5. **Test exports** - verify `seeding_summary.csv`, `dye_program_summary.csv`, `iMETA.csv`, and instruction downloads still work
6. **Mobile-first CSS** - use media queries for desktop

## Git Workflow (Optional)

```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "Add: description of change"
git push origin feature/my-feature
```

## Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev)

## Questions?

Check ORGANIZATION.md for architecture overview and component responsibilities.
