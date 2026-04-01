# Frontend Developer Guide

## Prerequisites

- Node.js 18+
- Python 3.11+
- A working backend Python environment, either Conda or a local virtual environment

## Local Development

Replace `/path/to/iCELL_V2` below with the actual location of your local repo.

Start the backend:

```bash
cd /path/to/iCELL_V2
source .venv/bin/activate  # or: conda activate iCELL
./scripts/start_backend.sh
```

Start the frontend:

```bash
cd /path/to/iCELL_V2/frontend
npm install
../scripts/start_frontend.sh
```

The frontend runs on the URL Vite prints in the terminal. Depending on your local config, this may be `http://localhost:3000` or `http://localhost:5173`.

To stop either server, return to its terminal and press `Ctrl+C`.

## Current Frontend Pages

- `DesignPage.tsx` for interactive plate design and run configuration
- `ResultsPage.tsx` for processed results and export review

## Current Upload Flow

- `App.tsx` owns the mode switch between design and file import
- `CSVUploader.tsx` handles uploaded config and CSV inputs

## Folder Roles

### `src/pages`

Top-level views. Keep page files focused on orchestration, layout, and high-level event handling.

### `src/components`

Reusable pieces used by pages. Shared presentation and interaction logic belongs here.

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
- browser devtools
- TypeScript check with `npx tsc --noEmit`

## Environment

Supported variables:

- `VITE_API_URL`
- `VITE_API_BASE_URL`

Fallback: `http://localhost:8000/api`
- Clear Vite cache: `rm -rf frontend/.vite`
- Update deps: `npm update`

### TypeScript errors
- Run: `npx tsc --noEmit` to see all errors
- Most are solved by proper typing in component imports

## Best Practices

1. **Keep components small** - max 300 lines per file
2. **Use Zustand hooks** - never prop-drill through 3+ levels
3. **Separate concerns** - UI logic separate from business logic
4. **Comment complex logic** - especially in utils and store
5. **Test exports** - verify CSV/PNG generation works
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
