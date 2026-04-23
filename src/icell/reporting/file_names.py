from __future__ import annotations

from datetime import datetime
import re


def sanitize_filename_part(value: object, default: str) -> str:
    text = "" if value is None else str(value).strip()
    if not text:
        return default

    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("._")
    return text or default


def format_export_timestamp(exported_at: datetime | None = None) -> str:
    when = exported_at or datetime.now()
    return when.strftime("%Y-%m-%d-%H-%M-%S")


def build_export_file_base(config: dict) -> str:
    project = config.get("project", {})
    project_name = sanitize_filename_part(project.get("name"), default="iCELL")
    plate_id = sanitize_filename_part(
        project.get("plate_id") or project.get("run_name"),
        default="plate",
    )
    return f"{project_name}_{plate_id}"


def build_export_filename(
    config: dict,
    artifact: str,
    extension: str,
    exported_at: datetime | None = None,
) -> str:
    base = build_export_file_base(config)
    safe_artifact = sanitize_filename_part(artifact, default="file")
    safe_extension = extension.lstrip(".") or "txt"
    timestamp = format_export_timestamp(exported_at)
    return f"iCELL_{base}_{safe_artifact}_{timestamp}.{safe_extension}"


__all__ = [
    "build_export_file_base",
    "build_export_filename",
    "format_export_timestamp",
    "sanitize_filename_part",
]
