from __future__ import annotations

from pathlib import Path
import pandas as pd

from icell.paths import PROJECT_ROOT


def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def validate_config(config: dict) -> None:
    seeding = config["seeding"]
    dye = config["dye"]
    paths = config["paths"]

    if seeding["final_well_volume_ul"] <= 0:
        raise ValueError("seeding.final_well_volume_ul must be > 0")

    if seeding["cell_suspension_dispense_ul"] <= 0:
        raise ValueError("seeding.cell_suspension_dispense_ul must be > 0")

    if seeding["media_dispense_ul"] < 0:
        raise ValueError("seeding.media_dispense_ul must be >= 0")

    if seeding["stock_cell_concentration_cells_per_ml"] <= 0:
        raise ValueError("seeding.stock_cell_concentration_cells_per_ml must be > 0")

    if seeding["min_cell_handling_volume_ul"] < 20:
        raise ValueError("seeding.min_cell_handling_volume_ul must be >= 20")

    if seeding["overage_fraction"] < 0:
        raise ValueError("seeding.overage_fraction must be >= 0")

    if not str(paths["cell_layout_csv"]).strip():
        raise ValueError("paths.cell_layout_csv must be provided")

    if not str(paths["output_tables_dir"]).strip():
        raise ValueError("paths.output_tables_dir must be provided")

    if not str(paths["output_instructions_dir"]).strip():
        raise ValueError("paths.output_instructions_dir must be provided")

    if not str(paths["output_logs_dir"]).strip():
        raise ValueError("paths.output_logs_dir must be provided")

    if dye["enabled"]:
        if dye["mastermix_dispense_ul_per_well"] <= 0:
            raise ValueError("dye.mastermix_dispense_ul_per_well must be > 0")

        if dye["min_dye_handling_volume_ul"] < 1:
            raise ValueError("dye.min_dye_handling_volume_ul must be >= 1")

        if not str(dye["meta_dye_csv"]).strip():
            raise ValueError("dye.meta_dye_csv must be provided when dye.enabled is true")

        if not str(paths["dye_layout_csv"]).strip():
            raise ValueError("paths.dye_layout_csv must be provided when dye.enabled is true")

        total = (
            seeding["cell_suspension_dispense_ul"]
            + dye["mastermix_dispense_ul_per_well"]
        )
        if abs(total - seeding["final_well_volume_ul"]) > 1e-9:
            raise ValueError(
                "When dye.enabled is true, cell_suspension_dispense_ul + "
                "mastermix_dispense_ul_per_well must equal final_well_volume_ul"
            )

    else:
        total = seeding["cell_suspension_dispense_ul"] + seeding["media_dispense_ul"]
        if abs(total - seeding["final_well_volume_ul"]) > 1e-9:
            raise ValueError(
                "When dye.enabled is false, cell_suspension_dispense_ul + media_dispense_ul "
                "must equal final_well_volume_ul"
            )


def validate_cell_layout_df(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("cell_layout.csv produced an empty dataframe")

    seeded = df["seed"] == 1
    if seeded.sum() == 0:
        raise ValueError("No seeded wells found in cell_layout.csv")

    if (df.loc[seeded, "cells_per_well"] <= 0).any():
        raise ValueError("All seeded wells must have cells_per_well > 0")


def validate_dye_layout_df(dye_df: pd.DataFrame, cell_df: pd.DataFrame) -> None:
    if dye_df.empty:
        raise ValueError("dye_layout.csv is empty")

    seeded_wells = set(cell_df.loc[cell_df["seed"] == 1, "well"])
    dye_wells = set(dye_df["well"])

    extra_dye_wells = dye_wells - seeded_wells
    if extra_dye_wells:
        raise ValueError(
            "dye_layout.csv contains wells that are not seeded in cell_layout.csv: "
            f"{sorted(extra_dye_wells)}"
        )


def validate_dye_file_if_needed(config: dict) -> None:
    if not config["dye"]["enabled"]:
        return

    meta_path = _resolve(config["dye"]["meta_dye_csv"])
    if not meta_path.exists():
        raise FileNotFoundError(f"meta_dye.csv not found: {meta_path}")

    dye_layout_path = _resolve(config["paths"]["dye_layout_csv"])
    if not dye_layout_path.exists():
        raise FileNotFoundError(f"dye_layout.csv not found: {dye_layout_path}")


def validate_meta_dye_df(df: pd.DataFrame) -> None:
    required = [
        "dye_program",
        "dye_name",
        "stock_concentration",
        "stock_concentration_unit",
        "final_concentration",
        "final_concentration_unit",
    ]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise KeyError(f"meta_dye.csv is missing required column(s): {missing}")

    if df.empty:
        raise ValueError("meta_dye.csv is empty")

    if df["dye_program"].astype(str).str.strip().eq("").any():
        raise ValueError("meta_dye.csv contains blank dye_program values")

    if df["dye_name"].astype(str).str.strip().eq("").any():
        raise ValueError("meta_dye.csv contains blank dye_name values")

    if (pd.to_numeric(df["stock_concentration"], errors="coerce") <= 0).any():
        raise ValueError("meta_dye.csv contains non-positive stock_concentration")

    if (pd.to_numeric(df["final_concentration"], errors="coerce") <= 0).any():
        raise ValueError("meta_dye.csv contains non-positive final_concentration")


def validate_dye_programs_match(dye_layout_df: pd.DataFrame, meta_dye_df: pd.DataFrame) -> None:
    layout_programs = set(dye_layout_df["dye_program"].astype(str).str.strip())
    meta_programs = set(meta_dye_df["dye_program"].astype(str).str.strip())

    missing_in_meta = layout_programs - meta_programs
    if missing_in_meta:
        raise ValueError(
            "dye_layout.csv contains dye_program values missing from meta_dye.csv: "
            f"{sorted(missing_in_meta)}"
        )