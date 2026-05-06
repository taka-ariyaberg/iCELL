#!/usr/bin/env bash
# stop.sh — Stop the iCELL containers.
#
# Usage:
#   ./scripts/stop.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

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
        echo "Error: the Docker engine is not reachable." >&2
        exit 1
    fi
}

cd "$REPO_ROOT"
require_docker

docker compose down