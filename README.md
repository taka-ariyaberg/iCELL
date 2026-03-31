# iCELL

iCELL is a cell seeding and dye preparation planning toolkit with two supported interfaces:

- The original notebook and config-driven workflow for reproducible runs from files
- A React + FastAPI web app for interactive plate design and review

Both workflows use the same Python calculation engine in [src/icell](src/icell).

## Open Source

iCELL is open source and released under the MIT License.

- Full license text: [LICENSE](LICENSE)
- You can use, modify, and distribute the project under the terms of that license.

## Supported Workflows

### Notebook and Config Workflow

Use this workflow when you want a file-based process driven by `config.json` and CSV inputs.

1. Edit [config/config.json](config/config.json)
2. Prepare input files in [data/input](data/input)
3. Run [notebooks/run.ipynb](notebooks/run.ipynb)

This remains the canonical notebook-first workflow and is fully supported.

### Web App Workflow

Use this workflow when you want to design plates in the browser and submit them directly to the backend.

- Frontend: [frontend](frontend)
- Backend API: [backend](backend)

The UI writes the same conceptual inputs and calls the same calculation engine used by the notebook workflow.

## Repository Layout

```text
iCELL/
├── backend/                FastAPI wrapper around the Python engine
├── config/                 Notebook/config workflow configuration files
├── data/
│   ├── examples/           Reference inputs for common runs
│   ├── input/              Working input files for notebook/API runs
│   └── output/             Generated tables, instructions, and logs
├── frontend/               React + TypeScript application
├── notebooks/              Notebook entry point for the original workflow
├── src/icell/              Core calculation engine
├── APP_SETUP.md            Web app setup and run guide
├── QUICKSTART.md           Fast start for both workflows
├── README.md               Repository overview
├── environment.yml         Conda environment for the Python workflow
└── pyproject.toml          Python package metadata
```

## Core Components

### Python Engine

The calculation engine in [src/icell](src/icell) is responsible for:

- Loading and validating config and input files
- Parsing plate layouts
- Computing cell suspension requirements
- Computing dye mastermix requirements
- Writing instructions, logs, and summary tables

Key entry points:

- [src/icell/main.py](src/icell/main.py)
- [src/icell/pipeline.py](src/icell/pipeline.py)

### Backend API

The API layer in [backend](backend) exposes the engine for the web app while preserving the original file-based workflow.

Key files:

- [backend/app.py](backend/app.py)
- [backend/api/routes.py](backend/api/routes.py)
- [backend/api/schemas.py](backend/api/schemas.py)
- [backend/services/icell_service.py](backend/services/icell_service.py)

### Frontend

The browser UI in [frontend](frontend) provides:

- Plate design and well selection
- Group and dye program assignment
- Submission to the backend API
- Results review and export

## Getting Started

### Python Environment

```bash
conda env create -f environment.yml
conda activate iCELL
```

### Notebook Workflow

1. Edit [config/config.json](config/config.json)
2. Put input files in [data/input](data/input)
3. Open and run [notebooks/run.ipynb](notebooks/run.ipynb)

### Web App Workflow

See [APP_SETUP.md](APP_SETUP.md).

Replace `/path/to/iCELL_V2` below with the actual location of your local repo.

In short:

```bash
# terminal 1
cd /path/to/iCELL_V2
conda activate iCELL
./scripts/start_backend.sh

# terminal 2
cd /path/to/iCELL_V2/frontend
npm install
../scripts/start_frontend.sh
```

To stop either server, go to its terminal and press `Ctrl+C`.

## Inputs and Outputs

### Inputs

- [config/config.json](config/config.json)
- [config/config.template.json](config/config.template.json)
- [config/schema.json](config/schema.json)
- [data/input/cell_layout.csv](data/input/cell_layout.csv)
- [data/input/dye_layout.csv](data/input/dye_layout.csv)
- [data/input/meta_dye.csv](data/input/meta_dye.csv)

### Outputs

Generated outputs are written under [data/output](data/output):

- `tables/` for CSV summaries and merged layouts
- `instructions/` for human-readable preparation instructions
- `logs/` for calculation logs and traceability

## Development Notes

- The notebook/config workflow is still fully supported and should remain stable.
- The web app is an additional interface, not a replacement for the original engine.
- Changes to calculation logic should be made in [src/icell](src/icell) first, then verified in both workflows.
- Changes to interaction, layout design, and results presentation generally belong in [frontend](frontend).

## Additional Documentation

- [QUICKSTART.md](QUICKSTART.md)
- [APP_SETUP.md](APP_SETUP.md)
- [LICENSE](LICENSE)
- [frontend/README.md](frontend/README.md)
- [frontend/DEVELOPER.md](frontend/DEVELOPER.md)
- [frontend/ORGANIZATION.md](frontend/ORGANIZATION.md)