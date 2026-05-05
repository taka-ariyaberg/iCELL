# iCELL

Cell seeding and dye preparation planning toolkit. MIT licensed — see [LICENSE](LICENSE).

Two interfaces, one engine ([src/icell](src/icell)):

| Interface | When to use |
|---|---|
| Notebook + config | File-driven, reproducible runs with the shared export pipeline |
| Web app (React + FastAPI) | Interactive plate design in the browser with the same calculations and exports |

## Repository Layout

```text
iCELL/
├── backend/                FastAPI wrapper around the Python engine
│   ├── app.py              App entry point
│   ├── api/routes.py       API endpoints
│   ├── api/schemas.py      Request/response models
│   └── services/           Bridges API to the engine
├── config/                 config template, schema, plate type definitions
├── data/
│   ├── examples/           Reference inputs for common run scenarios
│   ├── input/              Working inputs for notebook/API runs
│   └── output/             Generated tables, instructions, and logs (gitignored)
├── docker-compose.yml      Portable app + notebook runtime
├── Dockerfile              Multi-stage image for the web app and JupyterLab
├── frontend/               React + TypeScript UI
├── notebooks/run.ipynb     Notebook entry point
├── scripts/start.sh        Canonical Docker launcher
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

That command builds the image, starts both containers, waits for the app to respond, and opens the web app in your browser automatically.

Open:

- Web app: `http://localhost:8000`
- JupyterLab: `http://localhost:8888/lab?token=icell`

To start without opening the browser:

```bash
bash scripts/start.sh --no-open
```

To stop iCELL:

```bash
bash scripts/start.sh stop
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

Exported artifacts use a shared base name:

- `ProjectName__PlateID__YYYY-MM-DD__seeding_summary.csv`
- `ProjectName__PlateID__YYYY-MM-DD__dye_program_summary.csv`
- `ProjectName__PlateID__YYYY-MM-DD__iMETA.csv`
- `ProjectName__PlateID__YYYY-MM-DD__instructions.txt`

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

## Additional Documentation

- [docs/dependencies.md](docs/dependencies.md) — every dependency, version, and purpose
- [frontend/README.md](frontend/README.md) for frontend architecture notes
- [frontend/DEVELOPER.md](frontend/DEVELOPER.md) for frontend development conventions
- [frontend/ORGANIZATION.md](frontend/ORGANIZATION.md) for frontend structure
