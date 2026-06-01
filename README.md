# iCELL

[![CI](https://github.com/taka-ariyaberg/iCELL/actions/workflows/ci.yml/badge.svg)](https://github.com/taka-ariyaberg/iCELL/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](.python-version)
[![Node 20](https://img.shields.io/badge/node-20-blue.svg)](.nvmrc)

**iCELL** is a planning toolkit for cell seeding and dye preparation on multi-well plates. Given seeding parameters and per-well layouts, it computes per-well dispense volumes, total mastermix recipes, and machine-readable instructions — replacing error-prone manual spreadsheets in the wet-lab planning step.

It exposes the same engine through two surfaces so different users get the right ergonomics:

| Interface | When to use |
|---|---|
| Notebook + config | File-driven, reproducible runs. Edit a config + three CSVs, run a notebook cell, get the outputs. |
| Web app (React + FastAPI) | Interactive plate design in the browser with the same calculations and exports. |

iCELL output (`iCELL_..._cell_seeding.csv`, `iCELL_..._iMETA.csv`) feeds downstream tools — notably **iMETA** — without a manual reformat step.

## Why this exists

Planning a multi-well seeding run by hand means juggling cells/well, dye programs, dead volumes, overage, and instrument minimums across hundreds of wells. A 1 µL spreadsheet error becomes a wasted plate. iCELL takes the same parameters, applies them consistently, and produces the dispense plan, the human-readable protocol, and the metadata export needed for downstream analysis — all from one source of truth.

## Quickstart

```bash
git clone https://github.com/taka-ariyaberg/iCELL.git
cd iCELL
bash scripts/start.sh
```

That builds the Docker images, starts the FastAPI app + JupyterLab, and opens the web UI.

- Web app: `http://localhost:8080`
- API docs (auto-generated): `http://localhost:8080/docs`
- JupyterLab: `http://localhost:8888/lab?token=icell`

For full setup details, see [Setup](#setup) below.

## Status

The current release is `1.0.0`. The project is actively developed at Uppsala University. See the [CHANGELOG](CHANGELOG.md) for what's new.

## Disclaimer

iCELL is research software developed at Uppsala University. It is provided **as is**, without warranty of any kind, express or implied — including but not limited to merchantability, fitness for a particular purpose, and noninfringement. Outputs are computed from the inputs you provide; **always verify dispense volumes, recipes, and instructions before applying them to irreplaceable samples or in regulated workflows**. iCELL is **not** validated for clinical, diagnostic, or therapeutic use. See [LICENSE](LICENSE) for the legal terms.

## Repository Layout

For the full directory map and the rules for "where does X go?", see [docs/repo-structure.md](docs/repo-structure.md). Quick overview:

```text
iCELL/
├── backend/                FastAPI wrapper around the Python engine
│   ├── app.py              App entry point
│   ├── api/routes.py       API endpoints
│   ├── api/schemas.py      Request/response models
│   └── services/           Bridges API to the engine
├── config/                 config template, JSON schema, plate type definitions
├── data/
│   ├── examples/           Reference inputs for common run scenarios
│   ├── input/              Working inputs for notebook/API runs
│   ├── output/             Generated tables, instructions, and logs (gitignored)
│   └── templates/          Empty header-only CSVs to copy from
├── docker-compose.yml      Portable app + notebook runtime
├── Dockerfile              Multi-stage image for the web app and JupyterLab
├── docs/                   Project documentation (architecture, examples, deps)
├── frontend/               React + TypeScript UI
│   └── src/
│       ├── components/     Reusable cross-page components, grouped by domain
│       │   ├── inputs/         NumberInput, ViewModeSwitch
│       │   ├── plate/          PlateVisualization, PlateLegend
│       │   ├── primitives/     Unit, MetricRow, DetailCardHeader, …
│       │   └── protocol/       ProtocolSection, ProtocolDetailCard, types
│       ├── pages/          Page-level components, one subdir per page
│       │   ├── design/         DesignPage + 16 panel/modal/hook companions
│       │   └── results/        ResultsPage + ResultsDisplay
│       ├── services/       apiClient
│       ├── store/          Zustand state (plateStore + tests)
│       ├── styles/         Centralized stylesheets
│       └── utils/          Pure-function utilities
│           └── export/         File-export pipeline (CSV/SVG/PNG/download)
├── notebooks/run.ipynb     Notebook entry point
├── scripts/start.sh        Start the stack (auto-builds on first run)
├── scripts/stop.sh         Stop the stack
├── src/icell/              Core calculation engine
└── pyproject.toml          Python package metadata
```

## Setup

The supported setup is Docker only.

Requirements:

- A working `docker` installation
- `docker compose` available on the command line

Start iCELL from the repo root:

```bash
bash scripts/start.sh
```

The first time you run it the script builds the Docker image (one-time, ~1–2 minutes), starts both containers, waits for the app to respond, and opens the web app in your browser. **Subsequent runs reuse the cached image** and skip the build, so they're much faster. Run with `--build` after pulling code changes you want reflected in the running app:

```bash
bash scripts/start.sh --build      # force a rebuild
bash scripts/start.sh --no-open    # start without opening a browser
```

Open:

- Web app: `http://localhost:8080`
- JupyterLab: `http://localhost:8888/lab?token=icell`

To stop iCELL:

```bash
bash scripts/stop.sh
```

The Docker runtime mounts [config](config), [data](data), and [notebooks](notebooks) from your clone, so inputs, outputs, and notebook edits stay on the host machine.

Manual Docker commands, if you want them:

```bash
docker compose up -d --build
docker compose down
```

## Notebook Workflow

1. Copy [config/config.template.json](config/config.template.json) to `config/config.json`
2. Edit `config/config.json` for your run
3. Create `data/input/` if it does not already exist, then place your input CSVs there
4. Start iCELL with `bash scripts/start.sh`
5. Open [notebooks/run.ipynb](notebooks/run.ipynb) in JupyterLab

**Inputs:** `config/config.json`, `config/schema.json`, `data/input/cell_layout.csv`, `data/input/dye_layout.csv`, `data/input/meta_dye.csv`

`meta_dye.csv` remains the dye recipe input file. It is separate from the exported metadata report.

**Outputs** (written to [data/output](data/output), not committed):
- `tables/` — formatted CSV summaries, merged layouts, and `iMETA.csv`
- `instructions/` — human-readable preparation steps and downloadable protocol text
- `logs/` — calculation logs for traceability

Exported artifacts follow the format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, where `<base>` is built from `project.name` and `project.plate_id`:

- `iCELL_ProjectName_PlateID_seeding_summary_2026-05-06-10-30-45.csv`
- `iCELL_ProjectName_PlateID_dye_program_summary_2026-05-06-10-30-45.csv`
- `iCELL_ProjectName_PlateID_iMETA_2026-05-06-10-30-45.csv`
- `iCELL_ProjectName_PlateID_instructions_2026-05-06-10-30-45.txt`

`iMETA.csv` is the per-well metadata export. It includes Plate ID, well, user-defined group name, seeding date, initial stock cell suspension concentration, per-well cell suspension concentration, dye program assignment, and per-component mastermix additions in a single wide table.

---

## Development Notes

- Calculation logic lives in [src/icell](src/icell) — changes there apply to both workflows.
- API layer is in [backend](backend); UI logic is in [frontend](frontend).
- The design workflow now uses `Plate ID` as the primary project identifier. Legacy `run_name` is still accepted for backward compatibility.
- The results page includes an interactive protocol navigator plus direct downloads for instructions and `iMETA.csv`.
- Run inputs and generated outputs are gitignored.

## Dependencies

Every runtime dependency — Python interpreter, Node interpreter, Docker base images, every package — is documented in [docs/dependencies.md](docs/dependencies.md). That file is the single source of truth for what we depend on, which version, and why. Update it in the same commit whenever a dependency changes.

Quick reference:

- **Python:** 3.11 (Docker image `python:3.11.10-slim-bookworm`). Production deps in [`backend/requirements.txt`](backend/requirements.txt); transitive lock in [`backend/requirements.lock`](backend/requirements.lock).
- **Node:** 20 (Docker image `node:20.18.0-slim`). Deps in [`frontend/package.json`](frontend/package.json); lock in [`frontend/package-lock.json`](frontend/package-lock.json).
- **Pinned interpreters:** [`.python-version`](.python-version), [`.nvmrc`](.nvmrc).

## Citing iCELL

If you use iCELL in your research, please cite it. Citation metadata lives in [`CITATION.cff`](CITATION.cff) (GitHub displays a "Cite this repository" button on the repo page that uses it).

## Reporting Issues

Bug reports and feature ideas: open a [GitHub issue](https://github.com/taka-ariyaberg/iCELL/issues/new/choose) using the provided templates. Security issues — see [SECURITY.md](SECURITY.md) (do not file those publicly).

## Additional Documentation

- [docs/repo-structure.md](docs/repo-structure.md) — canonical directory layout and the rules for adding new files
- [docs/architecture.md](docs/architecture.md) — how the engine, backend, frontend, and notebook fit together
- [docs/examples.md](docs/examples.md) — end-to-end worked examples (simple seeding and dye program)
- [docs/dependencies.md](docs/dependencies.md) — every dependency, version, and purpose
- [data/templates/](data/templates) — empty CSV templates for the three input files
- [config/README.md](config/README.md) — config directory and `config.json` schema
- [config/plate_type/README.md](config/plate_type/README.md) — defining new plate types
- [frontend/README.md](frontend/README.md) — frontend-specific config (env variables, principles)
- [CHANGELOG.md](CHANGELOG.md) — release notes
