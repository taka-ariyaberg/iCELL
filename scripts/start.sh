#!/usr/bin/env bash
# start.sh — Docker-only launcher for iCELL.
#
# Usage:
#   ./scripts/start.sh           # start (auto-builds the first time only)
#   ./scripts/start.sh --build   # force a rebuild of the Docker image
#   ./scripts/start.sh --no-open # start without opening a browser
#
# After the first run the image is cached, so subsequent invocations
# just start the existing containers (much faster). Run with --build
# after editing source you want reflected in the running app.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

APP_URL="${ICELL_APP_URL:-http://localhost:8080}"
HEALTH_URL="${ICELL_HEALTH_URL:-${APP_URL%/}/api/health}"
NOTEBOOK_URL="${ICELL_NOTEBOOK_URL:-http://localhost:8888/lab?token=icell}"
OPEN_BROWSER="${ICELL_OPEN_BROWSER:-1}"
WAIT_TIMEOUT_SECONDS="${ICELL_START_TIMEOUT_SECONDS:-180}"
IMAGE_NAME="${ICELL_IMAGE:-icell:local}"
BUILD_REQUESTED=0

print_usage() {
    cat <<EOF
Usage:
  ./scripts/start.sh           # start (auto-builds the first time only)
  ./scripts/start.sh --build   # force a rebuild of the Docker image
  ./scripts/start.sh --no-open # start without opening a browser
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --build)
            BUILD_REQUESTED=1
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

image_exists() {
    docker image inspect "$IMAGE_NAME" >/dev/null 2>&1
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

# Auto-build on first run only. Skip rebuild on subsequent runs.
# Pass --build to force a rebuild after code changes.
if [[ "$BUILD_REQUESTED" == "1" ]]; then
    echo "Building iCELL containers (--build requested)..."
    docker compose up -d --build
elif ! image_exists; then
    echo "iCELL image not found locally — building (first run)..."
    docker compose up -d --build
else
    echo "Starting iCELL containers (cached image; use --build to rebuild)..."
    docker compose up -d
fi

ready=0
if wait_for_app; then
    ready=1
fi

echo ""
echo "Web app   → $APP_URL"
echo "Notebook  → $NOTEBOOK_URL"
echo "Stop      → bash scripts/stop.sh"
echo "Rebuild   → bash scripts/start.sh --build"
echo "Logs      → docker compose logs -f app"

if [[ "$ready" == "1" ]]; then
    open_app
fi