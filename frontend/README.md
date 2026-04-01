# iCELL Frontend

This frontend provides the interactive browser workflow for iCELL.

It is a React + TypeScript + Vite application that talks to the FastAPI backend and ultimately uses the same calculation engine as the notebook workflow.

This documentation reflects the current frontend structure in the final iCELL 1.0 repository state.

## Documentation

- [ORGANIZATION.md](./ORGANIZATION.md) for structure and responsibilities
- [DEVELOPER.md](./DEVELOPER.md) for day-to-day development
- [.env.example](.env.example) for local environment configuration

## Local Start

Replace `/path/to/iCELL_V2` below with the actual location of your local repo.

```bash
# backend
cd /path/to/iCELL_V2
source .venv/bin/activate  # or: conda activate iCELL
./scripts/start_backend.sh

# frontend
cd /path/to/iCELL_V2/frontend
npm install
../scripts/start_frontend.sh
```

Vite starts on the URL it prints in the terminal. Depending on your local config, this may be `http://localhost:3000` or `http://localhost:5173`.

To stop either server, return to its terminal and press `Ctrl+C`.

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
A: Edit `utils/exportUtils.ts`, export the new helper there, and wire the action into the owning page or component.

**Q: Can I modify the Python code?**
A: Yes, when the change belongs to calculation rules, validation, or shared workflow behavior. Keep those changes in the Python engine rather than duplicating them in React.

**Q: How do I debug CORS errors?**
A: Check the backend CORS configuration in `backend/app.py` and confirm the frontend is running on the origin Vite printed.

**Q: Why Zustand instead of Redux?**
A: Simpler, smaller bundle, less boilerplate for this use case.

**Q: Can I add new plate types?**
A: Configuration in backend, UI updates in PlateVisualization.tsx and store.

## Support

- **Architecture questions** → See ORGANIZATION.md
- **Setup problems** → See DEVELOPER.md Troubleshooting
- **Feature ideas** → Check current pages/components first
- **Backend integration** → Check apiClient.ts patterns
