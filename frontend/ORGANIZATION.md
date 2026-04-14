# Frontend Organization

## Structure

```text
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── pages/
│   │   ├── DesignPage.tsx
│   │   └── ResultsPage.tsx
│   ├── components/
│   │   ├── CSVUploader.tsx
│   │   ├── PlateVisualization.tsx
│   │   ├── ProtocolSection.tsx
│   │   └── ResultsDisplay.tsx
│   ├── store/
│   │   └── plateStore.ts
│   ├── services/
│   │   └── apiClient.ts
│   ├── utils/
│   └── styles/
├── public/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── index.html
```

## View Model

- `DesignPage.tsx` is the main interactive design surface
- `App.tsx` switches between interactive design and file-driven import
- `ResultsPage.tsx` reconstructs and presents processed output

## Shared Components

- `CSVUploader.tsx` handles file-driven submission and uploaded input files
- `PlateVisualization.tsx` is the core well-grid interaction component
- `ProtocolSection.tsx` renders the protocol navigator, plate-region legend, and instruction cards
- `ResultsDisplay.tsx` renders processed seeding and dye summaries plus summary CSV downloads

## State and Data Flow

```text
Page
  -> store actions and selectors
  -> API client
  -> backend
  -> results page reconstruction and display
  -> protocol navigator and export actions
```

The store owns interactive design state. The backend remains the source of truth for calculations.

## Boundaries

- Keep browser interaction logic in the frontend
- Keep calculation logic in the Python engine
- Keep API transport details in `services/apiClient.ts`
- Keep file-based notebook support independent of frontend state
- Keep export semantics aligned with backend outputs, especially `meta_dye.csv` as input and `iMETA.csv` as output

## Environment

Supported variables:

```text
VITE_API_URL=http://localhost:8000/api
```

or

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

If neither is set, the frontend uses `http://localhost:8000/api`.
