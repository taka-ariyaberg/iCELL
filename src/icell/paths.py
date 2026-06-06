from __future__ import annotations

import os
from pathlib import Path


def find_project_root(start: str | Path | None = None) -> Path:
    start_path = Path(start).resolve() if start else Path.cwd().resolve()
    for path in [start_path, *start_path.parents]:
        if (path / "config").exists() and (path / "src").exists():
            return path
    raise FileNotFoundError("Could not find project root containing 'config/' and 'src/'.")


RESOURCE_ROOT = Path(os.environ.get("ICELL_RESOURCE_ROOT", find_project_root())).resolve()
RUNTIME_ROOT = Path(os.environ.get("ICELL_RUNTIME_ROOT", RESOURCE_ROOT)).resolve()

PROJECT_ROOT = RESOURCE_ROOT

CONFIG_DIR = RESOURCE_ROOT / "config"
RUNTIME_CONFIG_DIR = RUNTIME_ROOT / "config"
DATA_DIR = RUNTIME_ROOT / "data"

# Input data paths
DATA_INPUT_DIR = DATA_DIR / "input"

# Output data paths
DATA_OUTPUT_DIR = DATA_DIR / "output"
OUTPUT_TABLES_DIR = DATA_OUTPUT_DIR / "tables"
OUTPUT_INSTRUCTIONS_DIR = DATA_OUTPUT_DIR / "instructions"
OUTPUT_LOGS_DIR = DATA_OUTPUT_DIR / "logs"

# Legacy paths (kept for backwards compatibility during transition)
INPUTS_DIR = DATA_INPUT_DIR
OUTPUTS_DIR = DATA_OUTPUT_DIR
LAYOUTS_DIR = DATA_INPUT_DIR
METADATA_DIR = DATA_INPUT_DIR


def ensure_output_dirs() -> None:
    for path in [
        OUTPUT_TABLES_DIR,
        OUTPUT_INSTRUCTIONS_DIR,
        OUTPUT_LOGS_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)
