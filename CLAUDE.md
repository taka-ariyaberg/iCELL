# CLAUDE.md — iCELL

## Project Context
**Name:** iCELL
**Stack:** Python 3.11, FastAPI, React, TypeScript, Vite, Zustand, Docker
**Domain:** Lab automation — cell seeding and dye preparation planning

iCELL is a full-stack web application (and Jupyter notebook) for planning cell seeding and dye preparation on multi-well plates. A shared Python engine (`src/icell/`) drives both interfaces. Given seeding parameters (cell line, density, plate type, dye program), it calculates per-well volumes and produces dispense instruction CSVs. Its output (`iCELL_..._cell_seeding.csv`) is one of three input files consumed by iMETA.

---

## Vault
- Project: `~/claude-workspace/Nexus_OV/iCELL_OV/`
- Shared:  `~/claude-workspace/Nexus_OV/_Commons_OV/`

**Save-location rule:** Project-specific work → `iCELL_OV/`. Cross-project workflow tooling, anything in `~/.claude/` or `~/claude-workspace/claude-steroid/` → `_Commons_OV/`. Applies to Specs, Plans, ADRs.

---

## Session Start
Read `~/claude-workspace/Nexus_OV/iCELL_OV/iCELL_Current.md`. That's it. Auto-memory loads MEMORY.md automatically; do not re-read iCELL_Home.md or Sessions logs unless something forces it.

## Session End
Run `/end-session`. It updates `Current.md`, appends a 5-line note to `Sessions/`, and writes ADRs/Learnings only when warranted.

---

## Agent Model Override Rubric
User agents (`~/.claude/agents/`) have sensible default `model:`. Override at dispatch when:

| Override | When |
|---|---|
| `reviewer` → `model: opus` | Security-critical diffs, auth/crypto, architectural reviews |
| `planner` → `model: sonnet` | Trivial CRUD plan, single-file change, no novel design |
| `executor` → `model: opus` | Plan involves subtle reasoning per step (rare) |

Default models otherwise. Trust the skills — don't add a routing table here.

---

## Setup / Quick Run

Docker only (no host Python/Node required):

```bash
bash scripts/start.sh          # build, start, open browser
bash scripts/start.sh --no-open
bash scripts/start.sh stop
```

- Web app: `http://localhost:8000`
- JupyterLab: `http://localhost:8888/lab?token=icell`

Manual Docker:
```bash
docker compose up -d --build
docker compose down
```

---

## Key Files
| File | Purpose |
|------|---------|
| `src/icell/` | Core calculation engine — all seeding/dye logic lives here |
| `backend/app.py` | FastAPI entry point |
| `backend/api/routes.py` | API endpoints |
| `backend/api/schemas.py` | Pydantic request/response models |
| `backend/services/icell_service.py` | Bridge between API and engine |
| `frontend/src/` | React + TypeScript UI |
| `config/config.template.json` | Config template for notebook runs |
| `scripts/start.sh` | Canonical launcher |

---

## Known Issues / Gotchas
- Docker is the only supported setup — no manual Python/Node install path

---

## Reference
- Skill descriptions: `~/claude-workspace/claude-steroid/skills/`
- Anti-patterns: `~/claude-workspace/claude-steroid/rules/anti-patterns.md`
