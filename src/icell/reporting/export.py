from __future__ import annotations

from pathlib import Path
import pandas as pd

from icell.reporting.formatted_exports import build_export_file_base


def ensure_parent_dir(path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def export_dataframe(df: pd.DataFrame, output_path: str | Path, index: bool = False) -> None:
    output_path = ensure_parent_dir(output_path)
    df.to_csv(output_path, index=index)


def export_text(text: str, output_path: str | Path) -> None:
    output_path = ensure_parent_dir(output_path)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(text)


def export_run_outputs(
    config: dict,
    merged_layout_df: pd.DataFrame,
    seeded_layout_df: pd.DataFrame,
    formatted_seeding_summary_df: pd.DataFrame,
    output_tables_dir: str | Path,
    formatted_dye_program_summary_df: pd.DataFrame | None = None,
    dye_recipe_df: pd.DataFrame | None = None,
    imeta_df: pd.DataFrame | None = None,
    instructions_text: str | None = None,
    output_instructions_dir: str | Path | None = None,
) -> dict[str, str]:
    output_tables_dir = Path(output_tables_dir)
    output_tables_dir.mkdir(parents=True, exist_ok=True)

    filename_base = build_export_file_base(config)

    written: dict[str, str] = {}

    merged_path = output_tables_dir / f"{filename_base}__merged_layout.csv"
    seeded_path = output_tables_dir / f"{filename_base}__seeded_layout.csv"
    seeding_summary_path = output_tables_dir / f"{filename_base}__seeding_summary.csv"

    export_dataframe(merged_layout_df, merged_path, index=False)
    export_dataframe(seeded_layout_df, seeded_path, index=False)
    export_dataframe(formatted_seeding_summary_df, seeding_summary_path, index=False)

    written["merged_layout_csv"] = str(merged_path)
    written["seeded_layout_csv"] = str(seeded_path)
    written["seeding_summary_csv"] = str(seeding_summary_path)

    if (
        formatted_dye_program_summary_df is not None
        and not formatted_dye_program_summary_df.empty
    ):
        dye_program_summary_path = output_tables_dir / f"{filename_base}__dye_program_summary.csv"
        export_dataframe(formatted_dye_program_summary_df, dye_program_summary_path, index=False)
        written["dye_program_summary_csv"] = str(dye_program_summary_path)

    if dye_recipe_df is not None and not dye_recipe_df.empty:
        dye_recipe_path = output_tables_dir / f"{filename_base}__dye_recipe.csv"
        export_dataframe(dye_recipe_df, dye_recipe_path, index=False)
        written["dye_recipe_csv"] = str(dye_recipe_path)

    if imeta_df is not None and not imeta_df.empty:
        imeta_path = output_tables_dir / f"{filename_base}__iMETA.csv"
        export_dataframe(imeta_df, imeta_path, index=False)
        written["imeta_csv"] = str(imeta_path)

    if instructions_text is not None and output_instructions_dir is not None:
        output_instructions_dir = Path(output_instructions_dir)
        output_instructions_dir.mkdir(parents=True, exist_ok=True)
        instructions_path = output_instructions_dir / f"{filename_base}__instructions.txt"
        export_text(instructions_text, instructions_path)
        written["instructions_txt"] = str(instructions_path)

    return written
