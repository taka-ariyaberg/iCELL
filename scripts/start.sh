#!/usr/bin/env bash
# start.sh — Launch and manage both backend and frontend for iCELL.
#
# Usage:
#   ./scripts/start.sh          # start both services
#   ./scripts/start.sh stop     # stop both services
#
# Python environment resolution (automatic, no manual activation needed):
#   1. .venv/ in the repo root (virtual environment)
#   2. conda run -n iCELL (or $ICELL_CONDA_ENV)
#   3. uvicorn already in PATH (env activated externally)
#
# Log files are written to /tmp/icell_backend.log and /tmp/icell_frontend.log.
# PID file is stored at /tmp/icell.pids.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

# ── auto-activate .venv if present and not already active ────────────────────

if [[ -f "$REPO_ROOT/.venv/bin/activate" ]] && [[ "${VIRTUAL_ENV:-}" != "$REPO_ROOT/.venv" ]]; then
    # shellcheck source=/dev/null
    source "$REPO_ROOT/.venv/bin/activate"
fi

PID_FILE="/tmp/icell.pids"
BACKEND_LOG="/tmp/icell_backend.log"
FRONTEND_LOG="/tmp/icell_frontend.log"

BACKEND_PORT="${ICELL_BACKEND_PORT:-8000}"

# ── helpers ──────────────────────────────────────────────────────────────────

stop_services() {
    if [[ ! -f "$PID_FILE" ]]; then
        echo "No running iCELL services found (PID file missing)."
        return 0
    fi

    local backend_pid frontend_pid
    read -r backend_pid frontend_pid < "$PID_FILE"

    for pid in "$backend_pid" "$frontend_pid"; do
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            echo "Stopping PID $pid..."
            kill "$pid"
        fi
    done

    rm -f "$PID_FILE"
    echo "All services stopped."
}

# ── stop command ─────────────────────────────────────────────────────────────

if [[ "${1:-}" == "stop" ]]; then
    stop_services
    exit 0
fi

# ── guard: don't double-start ─────────────────────────────────────────────────

if [[ -f "$PID_FILE" ]]; then
    read -r old_backend old_frontend < "$PID_FILE"
    if kill -0 "${old_backend:-}" 2>/dev/null || kill -0 "${old_frontend:-}" 2>/dev/null; then
        echo "iCELL is already running. Use './scripts/start.sh stop' to stop it first."
        exit 1
    else
        # Stale PID file
        rm -f "$PID_FILE"
    fi
fi

# ── resolve uvicorn ──────────────────────────────────────────────────────────

start_backend() {
    if command -v uvicorn >/dev/null 2>&1; then
        uvicorn backend.app:app --reload --port "$BACKEND_PORT" \
            > "$BACKEND_LOG" 2>&1 &
        echo $!
    elif command -v conda >/dev/null 2>&1; then
        conda run -n "${ICELL_CONDA_ENV:-iCELL}" \
            uvicorn backend.app:app --reload --port "$BACKEND_PORT" \
            > "$BACKEND_LOG" 2>&1 &
        echo $!
    else
        echo "Error: uvicorn not found. Set up a Python environment first (see README.md)." >&2
        exit 1
    fi
}

# ── start services ────────────────────────────────────────────────────────────

cd "$REPO_ROOT"

echo "Starting backend  → http://localhost:${BACKEND_PORT}  (log: $BACKEND_LOG)"
BACKEND_PID=$(start_backend)

echo "Starting frontend → http://localhost:3000          (log: $FRONTEND_LOG)"
(cd "$REPO_ROOT/frontend" && npm run dev > "$FRONTEND_LOG" 2>&1) &
FRONTEND_PID=$!

echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo ""
echo "Both services are running. Press Ctrl+C to stop."

# ── wait and relay Ctrl+C ────────────────────────────────────────────────────

cleanup() {
    echo ""
    echo "Shutting down..."
    stop_services
}

trap cleanup INT TERM

wait
