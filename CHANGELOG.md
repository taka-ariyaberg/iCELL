# Changelog

All notable changes to iCELL are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project quality roadmap (Phases 0–10) executed: foundation pins, tooling, dependency docs, input templates, JSON Schema for `config.json`, and full public-release scaffolding (CONTRIBUTING, CITATION, SECURITY, CoC, CHANGELOG, GitHub templates, Dependabot).
- `.python-version` and `.nvmrc` for interpreter pinning.
- `backend/requirements.lock` for reproducible Python installs.
- `frontend/.eslintrc.cjs` (permissive Phase-0 config) plus eslint, `@typescript-eslint`, and React plugins in `devDependencies`.
- `pyproject.toml` tooling sections for `ruff`, `mypy`, and `pytest`.
- `.editorconfig`, `.pre-commit-config.yaml`, and `.github/workflows/ci.yml`.
- `docs/dependencies.md` documenting every runtime and tooling dependency.
- `data/templates/` containing header-only CSV templates for `cell_layout`, `dye_layout`, and `meta_dye`, plus a README.
- `config/config.schema.json` (JSON Schema draft 2020-12) and `config/README.md`.
- `docs/examples.md` walkthrough.

### Changed
- Pinned Docker base images to patch level: `python:3.11.10-slim-bookworm` and `node:20.18.0-slim`.
- `pyproject.toml` declares `pandas>=2.0,<3` (loose range for library consumers); `backend/requirements.txt` continues to pin the install version exactly.
- Moved `jupyterlab` + `ipykernel` install behind a Dockerfile build arg `INSTALL_NOTEBOOK_DEPS` (default `true`, preserves current behavior).

### Fixed
- `µL` rendering on the Design page parameter labels (`Final Well Volume`, `Dead Volume — Cell Suspension`, `Dead Volume — Dye`). Root cause: `text-transform: uppercase` was case-mapping U+00B5 (MICRO SIGN) to U+039C (GREEK CAPITAL LETTER MU), which renders as a Latin "M". Introduced a small `<Unit>` primitive with `text-transform: none`.

## [1.0.0] — pre-changelog

The current `1.0.0` release predates this changelog. Future releases will start their entries here.