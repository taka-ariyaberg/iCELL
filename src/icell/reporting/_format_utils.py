"""Shared formatting / coercion helpers for the reporting subpackage.

These five helpers used to be defined byte-identically in
``formatted_exports.py`` and ``imeta.py``. They live here so there is one
source of truth and the two reporting modules import the same code.

Helpers that are specific to one reporting module (e.g. ``_has_text`` or
``_format_cell_concentration_value`` in ``imeta.py``) intentionally stay
in their owning module.
"""

from __future__ import annotations

import re

import pandas as pd


def _is_missing(value: object) -> bool:
    try:
        return bool(pd.isna(value))
    except TypeError:
        return False


def _clean_text(value: object, default: str = "") -> str:
    if _is_missing(value):
        return default
    text = str(value).strip()
    return text if text else default


def _to_float(value: object, default: float = 0.0) -> float:
    if _is_missing(value):
        return default
    return float(value)


def _format_number(value: float, digits: int = 6) -> str:
    text = f"{float(value):.{digits}f}".rstrip("0").rstrip(".")
    return text or "0"


def _normalize_header_text(value: str) -> str:
    text = re.sub(r"\s+", " ", value.strip())
    return text.replace("\n", " ").replace("\r", " ") or "unnamed"


__all__ = [
    "_is_missing",
    "_clean_text",
    "_to_float",
    "_format_number",
    "_normalize_header_text",
]