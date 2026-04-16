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
├── config/                 config.json, schema, plate type definitions
├── data/
│   ├── examples/           Reference inputs for common run scenarios
│   ├── input/              Working inputs for notebook/API runs
│   └── output/             Generated tables, instructions, and logs (gitignored)
├── frontend/               React + TypeScript UI
├── notebooks/run.ipynb     Notebook entry point
├── scripts/start.sh        Single-script launcher for the web app
├── src/icell/              Core calculation engine
├── environment.yml         Conda environment spec
└── pyproject.toml          Python package metadata
```

---

## Web App — First-Time Setup

> Do this once after cloning.

**1. Python environment** — pick one:

```bash
# Option A: virtual environment
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Option B: Conda
conda env create -f environment.yml
conda activate iCELL
pip install -r backend/requirements.txt
```

**2. Frontend dependencies:**

```bash
cd frontend
npm install
cd ..
```

**3. Launch:**

```bash
./scripts/start.sh
```

Backend → `http://localhost:8000` · Frontend → `http://localhost:3000`

---

## Web App — Returning Users

```bash
./scripts/start.sh
```

Press `Ctrl+C` to stop both services. To stop from a separate terminal:

```bash
./scripts/start.sh stop
```

Logs: `/tmp/icell_backend.log`, `/tmp/icell_frontend.log`

---

## Notebook Workflow

1. Edit [config/config.json](config/config.json)
2. Place input CSVs in [data/input](data/input)
3. Run [notebooks/run.ipynb](notebooks/run.ipynb)

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
- Run inputs, generated outputs, and environment files are gitignored.

## Additional Documentation

- [QUICKSTART.md](QUICKSTART.md)
- [frontend/README.md](frontend/README.md)
- [frontend/DEVELOPER.md](frontend/DEVELOPER.md)
- [frontend/ORGANIZATION.md](frontend/ORGANIZATION.md)
