from __future__ import annotations

from pathlib import Path
import pandas as pd


def read_csv_file(path: str | Path) -> pd.DataFrame:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {path}")
    return pd.read_csv(path)


def read_layout_csv(path: str | Path) -> pd.DataFrame:
    return read_csv_file(path)


def read_meta_dye_csv(path: str | Path) -> pd.DataFrame:
    return read_csv_file(path)
