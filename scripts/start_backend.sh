#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if command -v uvicorn >/dev/null 2>&1; then
    exec uvicorn backend.app:app --reload --port "${ICELL_BACKEND_PORT:-8000}" "$@"
fi

if command -v conda >/dev/null 2>&1; then
    exec conda run -n "${ICELL_CONDA_ENV:-iCELL}" uvicorn backend.app:app --reload --port "${ICELL_BACKEND_PORT:-8000}" "$@"
fi

echo "uvicorn was not found in PATH, and conda is unavailable to launch the iCELL environment." >&2
echo "Install backend dependencies or activate your Python environment before running this script." >&2
exit 1