# iCELL Frontend

This frontend provides the interactive browser workflow for iCELL.

It is a React + TypeScript + Vite application that talks to the FastAPI backend and ultimately uses the same calculation engine as the notebook workflow.

This documentation reflects the current frontend structure in the final iCELL 1.0 repository state.

## Documentation

- [../README.md](../README.md) for the canonical setup and runtime instructions
- [ORGANIZATION.md](./ORGANIZATION.md) for structure and responsibilities
- [DEVELOPER.md](./DEVELOPER.md) for day-to-day development
- [.env.example](.env.example) for local environment configuration

## Setup

Use the top-level [README.md](../README.md) as the only supported setup guide.

- iCELL is run through Docker only
- `bash scripts/start.sh` is the canonical repo entrypoint
- This frontend document intentionally avoids duplicating startup commands so the repo has one source of truth

## Current Frontend Structure

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── DesignPage.tsx
│   │   └── ResultsPage.tsx
│   ├── components/
│   │   ├── CSVUploader.tsx
│   │   ├── PlateVisualization.tsx
│   │   ├── ProtocolSection.tsx
│   │   └── ResultsDisplay.tsx
│   ├── services/
│   │   └── apiClient.ts
│   ├── store/
│   │   └── plateStore.ts
│   ├── utils/
│   ├── styles/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── package.json
└── vite.config.ts
```

## Responsibilities

- Pages orchestrate major views and user flows
- The upload workflow is owned by `App.tsx` plus `CSVUploader.tsx`, not a separate import page
- Components handle reusable visualization and presentation logic
- `ProtocolSection.tsx` owns the results-page protocol navigator, including the interactive plate-driven instruction view and the `iMETA.csv` download entry point
- `ResultsDisplay.tsx` owns the seeding and dye summary viewers plus their CSV exports
- The Zustand store owns interactive plate state and undo/redo history
- The API client is the single integration point for backend requests
- Calculation rules continue to live in the Python engine, with the frontend acting as the interactive client

## Environment Variables

Supported frontend API variables:

- `VITE_API_URL`
- `VITE_API_BASE_URL`

If neither is provided, the frontend defaults to `http://localhost:8000/api`.

## Development Principles

- Keep calculation rules in the Python engine, not duplicated in React
- Keep API access centralized in `src/services/apiClient.ts`
- Keep transient interaction state in the store rather than prop drilling
- Prefer focused components and minimal cross-cutting styling changes
- Keep results-page plate viewers visually aligned with the shared `PlateVisualization` patterns used elsewhere in the UI

## Common Tasks

| Task | File | How |
|------|------|-----|
| Add page | `pages/` | Create `.tsx` + route in App.tsx + CSS |
| Add reusable component | `components/` | Create `.tsx` with props interface + CSS |
| Add state | `store/plateStore.ts` | Add property + setter in Zustand |
| Add API call | `services/apiClient.ts` | Add function, import in component |
| Add utility | `utils/` | Create function file, import where needed |
| Add styling | `styles/` | Create class-based CSS, import in component |

## Contributing

1. Understand the architecture in [ORGANIZATION.md](./ORGANIZATION.md)
2. Follow existing page, store, and API patterns
3. Test the browser flow before committing
4. Update docs when changing user-facing behavior

## FAQ

**Q: How do I add a new export format?**
A: Prefer wiring shared backend outputs through the results page. Frontend-only downloads should use `utils/csvExport.ts` or `utils/exportUtils.ts` and be attached in the owning page or component.

**Q: What is `iMETA.csv`?**
A: It is the per-well metadata export. It is separate from `meta_dye.csv`, which remains an input file for dye recipe definitions, and it now includes user group labels plus both stock and per-well cell suspension concentrations.

**Q: Can I modify the Python code?**
A: Yes, when the change belongs to calculation rules, validation, or shared workflow behavior. Keep those changes in the Python engine rather than duplicating them in React.

**Q: How do I debug CORS errors?**
A: In the supported Docker setup the frontend is served by FastAPI at `http://localhost:8000`. If you see CORS errors, first confirm you are using the supported containerized runtime.

**Q: Why Zustand instead of Redux?**
A: Simpler, smaller bundle, less boilerplate for this use case.

**Q: Can I add new plate types?**
A: Configuration in backend, UI updates in PlateVisualization.tsx and store.

## Support

- **Architecture questions** → See ORGANIZATION.md
- **Setup problems** → See ../README.md
- **Feature ideas** → Check current pages/components first
- **Backend integration** → Check apiClient.ts patterns
