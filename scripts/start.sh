#!/usr/bin/env bash
# start.sh — Docker-only launcher for iCELL.
#
# Usage:
#   ./scripts/start.sh           # build, start, and open the app
#   ./scripts/start.sh --no-open # build and start without opening a browser
#   ./scripts/start.sh stop      # stop the iCELL containers

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

APP_URL="${ICELL_APP_URL:-http://localhost:8000}"
HEALTH_URL="${ICELL_HEALTH_URL:-${APP_URL%/}/api/health}"
NOTEBOOK_URL="${ICELL_NOTEBOOK_URL:-http://localhost:8888/lab?token=icell}"
OPEN_BROWSER="${ICELL_OPEN_BROWSER:-1}"
WAIT_TIMEOUT_SECONDS="${ICELL_START_TIMEOUT_SECONDS:-180}"
STOP_REQUESTED=0

print_usage() {
    cat <<EOF
Usage:
  ./scripts/start.sh [--open|--no-open]
  ./scripts/start.sh stop
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        stop)
            STOP_REQUESTED=1
            shift
            ;;
        --open)
            OPEN_BROWSER=1
            shift
            ;;
        --no-open)
            OPEN_BROWSER=0
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            print_usage >&2
            exit 1
            ;;
    esac
done

require_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: docker is not installed or not on PATH." >&2
        exit 1
    fi

    if ! docker compose version >/dev/null 2>&1; then
        echo "Error: docker compose is not available." >&2
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        echo "Error: the Docker engine is not reachable. Start Docker first, then retry." >&2
        exit 1
    fi
}

wait_for_app() {
    if ! command -v curl >/dev/null 2>&1; then
        return 0
    fi

    local deadline=$((SECONDS + WAIT_TIMEOUT_SECONDS))
    until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
        if (( SECONDS >= deadline )); then
            echo "Warning: iCELL did not become ready within ${WAIT_TIMEOUT_SECONDS}s." >&2
            return 1
        fi
        sleep 2
    done
}

open_app() {
    if [[ "$OPEN_BROWSER" != "1" ]]; then
        return 0
    fi

    if command -v open >/dev/null 2>&1; then
        open "$APP_URL" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$APP_URL" >/dev/null 2>&1 || true
    elif command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -Command "Start-Process '$APP_URL'" >/dev/null 2>&1 || true
    fi
}

cd "$REPO_ROOT"
mkdir -p data/input data/output/tables data/output/instructions data/output/logs

require_docker

if [[ "$STOP_REQUESTED" == "1" ]]; then
    docker compose down
    exit 0
fi

echo "Building and starting iCELL containers..."
docker compose up -d --build

ready=0
if wait_for_app; then
    ready=1
fi

echo ""
echo "Web app   → $APP_URL"
echo "Notebook  → $NOTEBOOK_URL"
echo "Stop      → bash scripts/start.sh stop"
echo "Logs      → docker compose logs -f app"

if [[ "$ready" == "1" ]]; then
    open_app
fi
