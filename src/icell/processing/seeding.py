from __future__ import annotations

import math
import pandas as pd


def calculate_required_cell_suspension_concentration(
    cells_per_well: pd.Series,
    cell_suspension_dispense_ul: float,
) -> pd.Series:
    dispense = pd.to_numeric(cell_suspension_dispense_ul, errors="raise")
    if hasattr(dispense, "any"):
        if (dispense <= 0).any():
            raise ValueError("cell_suspension_dispense_ul must be > 0")
    elif dispense <= 0:
        raise ValueError("cell_suspension_dispense_ul must be > 0")

    volume_ml = dispense / 1000.0
    return cells_per_well / volume_ml


def add_seeding_calculations(
    df_seeded: pd.DataFrame,
    final_well_volume_ul: float,
    default_cell_suspension_dispense_ul: float,
    dye_enabled: bool,
) -> pd.DataFrame:
    df = df_seeded.copy()

    if dye_enabled and "dye_program" in df.columns:
        has_dye_program = df["dye_program"].notna() & (
            df["dye_program"].astype(str).str.strip() != ""
        )
        df["cell_suspension_dispense_ul_per_well"] = default_cell_suspension_dispense_ul
        df.loc[~has_dye_program, "cell_suspension_dispense_ul_per_well"] = final_well_volume_ul
    else:
        df["cell_suspension_dispense_ul_per_well"] = default_cell_suspension_dispense_ul

    df["required_cell_suspension_conc_cells_per_ml"] = (
        calculate_required_cell_suspension_concentration(
            cells_per_well=df["cells_per_well"],
            cell_suspension_dispense_ul=df["cell_suspension_dispense_ul_per_well"],
        )
    )

    return df


def summarize_seeding_groups(
    df_seeded: pd.DataFrame,
    overage_fraction: float,
    dead_volume_cell_suspension_ul: float = 0.0,
) -> pd.DataFrame:
    if overage_fraction < 0:
        raise ValueError("overage_fraction must be >= 0")
    if dead_volume_cell_suspension_ul < 0:
        raise ValueError("dead_volume_cell_suspension_ul must be >= 0")

    df = df_seeded.copy()

    group_cols = ["cells_per_well", "cell_suspension_dispense_ul_per_well"]
    optional_group_cols = ["cell_line", "condition", "group"]
    for col in optional_group_cols:
        if col in df.columns:
            group_cols.append(col)

    grouped = []
    for group_key, group_df in df.groupby(group_cols, dropna=False):
        if not isinstance(group_key, tuple):
            group_key = (group_key,)

        row = {col: val for col, val in zip(group_cols, group_key)}
        group_df = group_df.sort_values(["row", "column"]).reset_index(drop=True)

        row["n_wells"] = int(len(group_df))
        row["wells"] = ", ".join(group_df["well"].tolist())
        grouped.append(row)

    summary = pd.DataFrame(grouped)

    summary["base_cell_suspension_volume_ul"] = (
        summary["n_wells"] * summary["cell_suspension_dispense_ul_per_well"]
    )
    summary["total_cell_suspension_volume_ul"] = (
        summary["base_cell_suspension_volume_ul"] * (1.0 + overage_fraction)
        + dead_volume_cell_suspension_ul
    )
    summary["required_cell_suspension_conc_cells_per_ml"] = (
        summary["cells_per_well"] / (summary["cell_suspension_dispense_ul_per_well"] / 1000.0)
    )

    return summary.sort_values(group_cols).reset_index(drop=True)


def plan_cell_suspension_intermediate(
    target_conc_cells_per_ml: float,
    final_volume_ul: float,
    stock_conc_cells_per_ml: float,
    min_cell_handling_volume_ul: float,
) -> dict:
    if target_conc_cells_per_ml <= 0:
        raise ValueError("target_conc_cells_per_ml must be > 0")
    if final_volume_ul < min_cell_handling_volume_ul:
        raise ValueError(
            f"Requested final_volume_ul ({final_volume_ul}) is below "
            f"min_cell_handling_volume_ul ({min_cell_handling_volume_ul})"
        )
    if stock_conc_cells_per_ml <= 0:
        raise ValueError("stock_conc_cells_per_ml must be > 0")
    if target_conc_cells_per_ml > stock_conc_cells_per_ml:
        raise ValueError("Target concentration cannot be greater than stock concentration")

    source_volume_ul = (
        target_conc_cells_per_ml * final_volume_ul / stock_conc_cells_per_ml
    )
    diluent_volume_ul = final_volume_ul - source_volume_ul

    needs_intermediate = source_volume_ul < min_cell_handling_volume_ul

    return {
        "target_conc_cells_per_ml": float(target_conc_cells_per_ml),
        "stock_conc_cells_per_ml": float(stock_conc_cells_per_ml),
        "final_volume_ul": float(final_volume_ul),
        "source_volume_ul": float(source_volume_ul),
        "diluent_volume_ul": float(diluent_volume_ul),
        "min_cell_handling_volume_ul": float(min_cell_handling_volume_ul),
        "needs_intermediate": bool(needs_intermediate),
    }


def choose_intermediate_final_volume_ul(
    target_conc_cells_per_ml: float,
    stock_conc_cells_per_ml: float,
    min_cell_handling_volume_ul: float,
    preferred_final_volume_ul: float,
) -> float:
    required_final_volume_ul = (
        min_cell_handling_volume_ul * stock_conc_cells_per_ml / target_conc_cells_per_ml
    )
    return float(max(preferred_final_volume_ul, math.ceil(required_final_volume_ul)))