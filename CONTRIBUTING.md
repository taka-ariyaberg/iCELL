# Contributing to iCELL

Thanks for considering a contribution. This guide covers everything you need to know to develop locally, follow the project's conventions, and submit changes that get merged smoothly.

## Quick start (development)

```bash
git clone https://github.com/taka-ariyaberg/iCELL.git
cd iCELL
bash scripts/start.sh
```

That builds the Docker images, starts the FastAPI app + JupyterLab, and opens the web app in your browser. See [README](README.md) for more.

## Repo conventions in one place

- **Stack:** Python 3.11, FastAPI, React 18, TypeScript, Vite, Zustand, Docker. See [`docs/dependencies.md`](docs/dependencies.md) for every pinned version.
- **Repository layout:** [`docs/repo-structure.md`](docs/repo-structure.md) is the source of truth for where files go. Quick rules: domain-grouped subdirs in `frontend/src/components/` (only when 2+ files share a domain), one subdir per page in `pages/`, related utility cluster (e.g. the export pipeline) in `utils/<group>/`, single files stay at the parent level. CSS lives centrally in `frontend/src/styles/`, not co-located.
- **File-size discipline:** target ~200–300 LOC per source file; >500 LOC trips the `max-lines` warning and is a strong split signal. Split on cohesion (independent concerns), not raw line count — a tight callgraph stays in one file.
- **Naming:** PascalCase for `.tsx` components, camelCase for `.ts` utilities, snake_case for Python modules. Booleans use `is*`/`has*`/`show*` prefixes; event handlers are `handleX` (internal) vs `onX` (props). Identifiers carrying a unit suffix it (`_ul`, `_ml`, `Ul`, `Pct`).
- **Commits:** small, focused, one concern per commit. The first line summarizes the change in ≤72 chars; the body explains the *why*. Use Conventional Commits prefixes where they fit (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).
- **PRs:** describe the *why*, link to any relevant issue, list manual verification steps you ran. Small PRs review faster.
- **Branches:** off `main`. Name them descriptively (`feat/seeding-volume-validator`, `fix/µL-display`).
- **Plans:** non-trivial work is planned before code. See `~/claude-workspace/Nexus_OV/iCELL_OV/Plans/` for the project's roadmap and per-phase plans.

## Code style

| Layer | Tool | Configured in |
|---|---|---|
| Python lint + format | `ruff` | `pyproject.toml` `[tool.ruff]` |
| Python types | `mypy` | `pyproject.toml` `[tool.mypy]` |
| Python tests | `pytest` | `pyproject.toml` `[tool.pytest.ini_options]` |
| Frontend lint | `eslint` | `frontend/.eslintrc.cjs` |
| Frontend types | `tsc --noEmit` | `frontend/tsconfig.json` |
| Frontend tests | `vitest` | `frontend/vitest.config.ts` |
| Whitespace, EOL | `.editorconfig` | repo root |

Run the full check locally:

```bash
# Backend
ruff check src/icell
mypy src/icell
pytest tests

# Frontend
cd frontend && npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

CI runs the same on every push and PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Naming conventions

The project's naming conventions are documented in the codebase quality roadmap. Highlights:

| Dimension | Convention |
|---|---|
| React components | `PascalCase.tsx` |
| TS utilities | `camelCase.ts` |
| Python modules | `snake_case.py` |
| Booleans | `is*` / `has*` / `show*` / `should*` |
| Event handlers | `handleX` (internal), `onX` (props) |
| Constants | `UPPER_SNAKE_CASE` |
| HTTP routes | `kebab-case` |
| CSS classes | `kebab-case` |
| Identifiers carrying units | suffix the unit (`_ul`, `_ml`, `Ul`, `Pct`) |

When uncertain, match the surrounding code.

## Testing

- Add a test with every feature, bug fix, or refactor. The test should fail before your change and pass after.
- Backend tests live in `tests/`. Frontend tests are co-located: `frontend/src/**/X.test.ts`.
- Don't merge code that breaks existing tests. CI enforces this.

## Pre-commit

Optional but recommended:

```bash
pip install pre-commit
pre-commit install
```

The hooks fix EOL and trailing whitespace and validate YAML/JSON. Stricter hooks (ruff, mypy, prettier, eslint) are listed in `.pre-commit-config.yaml` but commented out — they will be enabled phase by phase as the codebase is cleaned up.

## Reporting bugs and proposing features

Use the GitHub issue templates: bug reports, feature requests. See `.github/ISSUE_TEMPLATE/`.

## Security issues

See [`SECURITY.md`](SECURITY.md). **Do not file public issues for security problems.**

## Code of Conduct

This project follows the Contributor Covenant 2.1. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Be kind.

## Licensing

By contributing you agree that your contributions are licensed under the project's [MIT License](LICENSE).