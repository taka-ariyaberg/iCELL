"""iCELL — cell seeding and dye preparation planning toolkit.

The FastAPI backend calls into this package. The public surface is:

- ``run_icell`` — the lower-level entry the backend uses.
- ``__version__`` — semver string for citation / changelog.

Both call paths share the same code under ``icell.processing`` and
``icell.reporting``.
"""

from __future__ import annotations

__version__ = "1.0.0"

from icell.main import run_icell

__all__ = [
    "__version__",
    "run_icell",
]