from __future__ import annotations

from datetime import datetime
from pathlib import Path
import json
import pandas as pd


def _section(title: str) -> str:
    return f"{title}\n{'=' * len(title)}\n"


def _df_to_text(df: pd.DataFrame) -> str:
    if df is None or df.empty:
        return "None\n"
    return df.to_string(index=False) + "\n"


def build_run_log_text(
    config: dict,
    merged_layout_df: pd.DataFrame,
    seeded_layout_df: pd.DataFrame,
    seeding_summary_df: pd.DataFrame,
    dye_program_summary_df: pd.DataFrame | None,
    dye_recipe_df: pd.DataFrame | None,
    written_files: dict[str, str],
    instructions_text: str,
) -> str:
    lines: list[str] = []

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines.append(_section("RUN LOG").rstrip())
    lines.append(f"Timestamp: {timestamp}")
    lines.append(f"Project name: {config['project']['name']}")
    lines.append(f"Run name: {config['project']['run_name']}")
    lines.append("")

    lines.append(_section("INPUT FILES").rstrip())
    lines.append(f"Cell layout: {config['paths']['cell_layout_csv']}")
    lines.append(f"Dye layout: {config['paths']['dye_layout_csv']}")
    lines.append(f"Meta dye: {config['dye']['meta_dye_csv']}")
    lines.append("")

    lines.append(_section("CORE CONFIG").rstrip())
    lines.append(json.dumps(config, indent=2))
    lines.append("")

    lines.append(_section("RUN SUMMARY").rstrip())
    lines.append(f"Seeded wells count: {len(seeded_layout_df)}")
    lines.append(
        f"Dye-enabled seeded wells count: "
        f"{int(seeded_layout_df['dye_program'].notna().sum()) if 'dye_program' in seeded_layout_df.columns else 0}"
    )
    lines.append(f"Seeding groups count: {len(seeding_summary_df)}")
    lines.append(
        f"Dye programs count: {len(dye_program_summary_df) if dye_program_summary_df is not None else 0}"
    )
    lines.append("")

    lines.append(_section("MERGED LAYOUT TABLE").rstrip())
    lines.append(_df_to_text(merged_layout_df))

    lines.append(_section("SEEDED LAYOUT TABLE").rstrip())
    lines.append(_df_to_text(seeded_layout_df))

    lines.append(_section("SEEDING SUMMARY").rstrip())
    lines.append(_df_to_text(seeding_summary_df))

    lines.append(_section("DYE PROGRAM SUMMARY").rstrip())
    lines.append(_df_to_text(dye_program_summary_df if dye_program_summary_df is not None else pd.DataFrame()))

    lines.append(_section("DYE RECIPE").rstrip())
    lines.append(_df_to_text(dye_recipe_df if dye_recipe_df is not None else pd.DataFrame()))

    lines.append(_section("OUTPUT FILES").rstrip())
    if written_files:
        for key, value in written_files.items():
            lines.append(f"{key}: {value}")
    else:
        lines.append("None")
    lines.append("")

    lines.append(_section("INSTRUCTIONS").rstrip())
    lines.append(instructions_text.rstrip())
    lines.append("")

    return "\n".join(lines)


def write_run_log(text: str, output_path: str | Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")