# CLAUDE.md — iCELL

## Project Context
**Name:** iCELL
**Stack:** Python 3.11, FastAPI, React, TypeScript, Vite, Zustand, Docker
**Domain:** Lab automation — cell seeding and dye preparation planning

iCELL is a full-stack web application (and Jupyter notebook) for planning cell seeding and dye preparation on multi-well plates. A shared Python engine (`src/icell/`) drives both interfaces. Given seeding parameters (cell line, density, plate type, dye program), it calculates per-well volumes and produces dispense instruction CSVs. Its output (`iCELL_..._cell_seeding.csv`) is one of three input files consumed by iMETA.

---

## Vault Pointer
Primary vault: `/Users/takar834/Documents/UU/TIMED/Tools/Nexus_OV/iCELL_OV/`
Shared vault:  `/Users/takar834/Documents/UU/TIMED/Tools/Nexus_OV/_Commons_OV/`

---

## Session Start Ritual
1. Read `../Nexus_OV/iCELL_OV/iCELL_Home.md` — master index
2. Read `../Nexus_OV/iCELL_OV/iCELL_Current.md` — **live focus; trust this over Home.md**
3. Read the most recent file in `../Nexus_OV/iCELL_OV/Sessions/` for context continuity
4. Skim `../Nexus_OV/_Commons_OV/Commons_Home.md` for cross-project patterns
5. Do NOT re-read the whole repo from scratch — the vault is the cached understanding

---

## Session End Ritual
1. Append a dated note to `../Nexus_OV/iCELL_OV/Sessions/` using `Templates/iCELL_Session_Note.md`
2. Update `../Nexus_OV/iCELL_OV/iCELL_Current.md` if focus, blockers, or next steps shifted
3. Add to `../Nexus_OV/iCELL_OV/Decisions/` for any architectural choice made today
4. Escalate generalizable learnings to `../Nexus_OV/_Commons_OV/`

---

## Routing Table — Auto-Trigger Rules

| Situation | Action |
|-----------|--------|
| New feature / change >50 lines | `superpowers` plugin — brainstorm → plan → TDD |
| Frontend UI work (React) | `frontend-design` plugin + `/impeccable` (default) or `/emilkowalski-skill` for interaction-heavy work |
| Pre-commit / pre-PR on non-trivial diffs | `code-review` plugin |
| Auth, crypto, input validation, secrets, deps | `/security-review` — **mandatory** |
| Design audit requested | `/impeccable /audit` then `/impeccable /polish` |

---

## Setup

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

## Anti-Patterns
- Never load multiple taste/design skills simultaneously
- Never skip superpowers brainstorm on features >50 lines
- Never commit non-trivial diffs without code-review
- Never re-read the full repo from scratch — always start from vault

---

## Reference
Skills and workflow recipes: `~/claude-steroid/skills/` and `~/claude-steroid/workflows/`
