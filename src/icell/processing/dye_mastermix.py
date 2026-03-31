from __future__ import annotations

import pandas as pd

# Supported concentration units mapped to a canonical unit and their conversion factor.
# canonical_value = original_value * factor
# Units within the same canonical group are interconvertible; across groups they are not.
_UNIT_FACTORS: dict[str, tuple[float, str]] = {
    # Mass per volume -> canonical: ug_per_ml
    "mg_per_ml": (1_000.0, "ug_per_ml"),
    "ug_per_ml": (1.0, "ug_per_ml"),
    "ng_per_ml": (1e-3, "ug_per_ml"),
    # Molar -> canonical: uM
    "mM": (1_000.0, "uM"),
    "uM": (1.0, "uM"),
    "nM": (1e-3, "uM"),
    # Enzyme / activity -> canonical: units_per_ml
    "units_per_ml": (1.0, "units_per_ml"),
    # Fold concentration (dimensionless) -> canonical: X
    # e.g. 10X stock to 1X final: ratio = 1/10, no conversion needed
    "X": (1.0, "X"),
}


def _normalize_concentration(value: float, unit: str) -> tuple[float, str]:
    """Return (normalized_value, canonical_unit) for a concentration."""
    unit = unit.strip()
    if unit not in _UNIT_FACTORS:
        supported = ", ".join(sorted(_UNIT_FACTORS))
        raise ValueError(
            f"Unsupported concentration unit '{unit}'. Supported units: {supported}"
        )
    factor, canonical = _UNIT_FACTORS[unit]
    return float(value) * factor, canonical


def build_dye_program_summary(
    merged_df: pd.DataFrame,
    mastermix_dispense_ul_per_well: float,
    overage_fraction: float,
    dead_volume_dye_ul: float = 0.0,
) -> pd.DataFrame:
    if mastermix_dispense_ul_per_well <= 0:
        raise ValueError("mastermix_dispense_ul_per_well must be > 0")
    if overage_fraction < 0:
        raise ValueError("overage_fraction must be >= 0")
    if dead_volume_dye_ul < 0:
        raise ValueError("dead_volume_dye_ul must be >= 0")

    df = merged_df.copy()
    df = df.loc[(df["seed"] == 1) & (df["dye_program"].notna())].copy()

    if df.empty:
        return pd.DataFrame(
            columns=[
                "dye_program",
                "n_wells",
                "wells",
                "mastermix_dispense_ul_per_well",
                "base_mastermix_volume_ul",
                "total_mastermix_volume_ul",
                "final_diluent_volume_ul",
            ]
        )

    grouped = []
    for dye_program, group_df in df.groupby("dye_program", dropna=False):
        group_df = group_df.sort_values(["row", "column"]).reset_index(drop=True)
        grouped.append(
            {
                "dye_program": dye_program,
                "n_wells": int(len(group_df)),
                "wells": ", ".join(group_df["well"].tolist()),
            }
        )

    summary = pd.DataFrame(grouped)

    summary["mastermix_dispense_ul_per_well"] = mastermix_dispense_ul_per_well
    summary["base_mastermix_volume_ul"] = (
        summary["n_wells"] * mastermix_dispense_ul_per_well
    )
    summary["total_mastermix_volume_ul"] = (
        summary["base_mastermix_volume_ul"] * (1.0 + overage_fraction)
        + dead_volume_dye_ul
    )
    summary["final_diluent_volume_ul"] = pd.NA

    return summary.sort_values("dye_program").reset_index(drop=True)


def add_2x_mastermix_targets(
    meta_dye_df: pd.DataFrame,
    final_well_volume_ul: float,
    mastermix_dispense_ul_per_well: float,
) -> pd.DataFrame:
    if final_well_volume_ul <= 0:
        raise ValueError("final_well_volume_ul must be > 0")
    if mastermix_dispense_ul_per_well <= 0:
        raise ValueError("mastermix_dispense_ul_per_well must be > 0")

    df = meta_dye_df.copy()
    concentration_factor = final_well_volume_ul / mastermix_dispense_ul_per_well
    df["mastermix_target_concentration"] = (
        pd.to_numeric(df["final_concentration"], errors="raise") * concentration_factor
    )
    return df


def _calculate_intermediate_plan(
    stock_concentration: float,
    mastermix_target_concentration: float,
    total_mastermix_volume_ul: float,
    min_dye_handling_volume_ul: float,
) -> dict:
    needed_amount = mastermix_target_concentration * total_mastermix_volume_ul

    max_intermediate_concentration = needed_amount / min_dye_handling_volume_ul
    intermediate_concentration = min(stock_concentration, max_intermediate_concentration)

    if intermediate_concentration <= 0:
        raise ValueError("Computed invalid intermediate concentration")

    intermediate_transfer_ul = needed_amount / intermediate_concentration

    if intermediate_transfer_ul < min_dye_handling_volume_ul:
        raise ValueError(
            "Could not create a valid dye intermediate plan meeting the minimum handling volume"
        )

    intermediate_stock_volume_ul = min_dye_handling_volume_ul
    intermediate_final_volume_ul = (
        stock_concentration * intermediate_stock_volume_ul / intermediate_concentration
    )
    intermediate_diluent_volume_ul = (
        intermediate_final_volume_ul - intermediate_stock_volume_ul
    )

    return {
        "intermediate_concentration": float(intermediate_concentration),
        "intermediate_transfer_ul": float(intermediate_transfer_ul),
        "intermediate_stock_volume_ul": float(intermediate_stock_volume_ul),
        "intermediate_final_volume_ul": float(intermediate_final_volume_ul),
        "intermediate_diluent_volume_ul": float(intermediate_diluent_volume_ul),
    }


def calculate_dye_recipe_for_program(
    dye_program: str,
    program_meta_df: pd.DataFrame,
    total_mastermix_volume_ul: float,
    min_dye_handling_volume_ul: float,
) -> pd.DataFrame:
    if total_mastermix_volume_ul <= 0:
        raise ValueError("total_mastermix_volume_ul must be > 0")
    if min_dye_handling_volume_ul < 1:
        raise ValueError("min_dye_handling_volume_ul must be >= 1")

    df = program_meta_df.copy()
    df = df.loc[df["dye_program"] == dye_program].copy()

    if df.empty:
        raise ValueError(f"No meta_dye rows found for dye_program '{dye_program}'")

    df["stock_concentration"] = pd.to_numeric(df["stock_concentration"], errors="raise")
    df["final_concentration"] = pd.to_numeric(df["final_concentration"], errors="raise")

    if "mastermix_target_concentration" not in df.columns:
        raise ValueError(
            "program_meta_df must contain 'mastermix_target_concentration'. "
            "Run add_2x_mastermix_targets() first."
        )

    df["mastermix_target_concentration"] = pd.to_numeric(
        df["mastermix_target_concentration"], errors="raise"
    )

    # Normalize stock and target concentrations to a shared canonical unit so that
    # users can freely mix compatible units (e.g. stock in mg_per_ml, final in ug_per_ml).
    stock_canon_values: list[float] = []
    target_canon_values: list[float] = []
    for _, row in df.iterrows():
        try:
            s_val, s_canonical = _normalize_concentration(
                float(row["stock_concentration"]),
                str(row["stock_concentration_unit"]),
            )
            t_val, t_canonical = _normalize_concentration(
                float(row["mastermix_target_concentration"]),
                str(row["final_concentration_unit"]),
            )
        except ValueError as exc:
            raise ValueError(f"Dye '{row['dye_name']}': {exc}") from exc

        if s_canonical != t_canonical:
            raise ValueError(
                f"Incompatible unit dimensions for dye '{row['dye_name']}': "
                f"stock unit '{row['stock_concentration_unit']}' and "
                f"final unit '{row['final_concentration_unit']}' belong to different "
                f"physical dimensions and cannot be converted to each other. "
                f"Both must be mass/volume (mg_per_ml, ug_per_ml, ng_per_ml), "
                f"molar (mM, uM, nM), or activity (units_per_ml)."
            )
        stock_canon_values.append(s_val)
        target_canon_values.append(t_val)
        # Verify both are in the same canonical unit (already checked above)

    df["_stock_canon"] = stock_canon_values
    df["_target_canon"] = target_canon_values
    # Store canonical unit string so instructions can display intermediate concentrations correctly
    df["_canonical_unit"] = [
        _UNIT_FACTORS[str(row["final_concentration_unit"]).strip()][1]
        for _, row in df.iterrows()
    ]

    df["total_mastermix_volume_ul"] = float(total_mastermix_volume_ul)
    df["dye_stock_volume_ul"] = (
        df["_target_canon"] * df["total_mastermix_volume_ul"]
        / df["_stock_canon"]
    )
    df["needs_intermediate"] = (
        df["dye_stock_volume_ul"] < float(min_dye_handling_volume_ul)
    )

    df["intermediate_concentration"] = pd.NA
    df["intermediate_transfer_ul"] = pd.NA
    df["intermediate_stock_volume_ul"] = pd.NA
    df["intermediate_final_volume_ul"] = pd.NA
    df["intermediate_diluent_volume_ul"] = pd.NA

    for idx, row in df.loc[df["needs_intermediate"]].iterrows():
        plan = _calculate_intermediate_plan(
            stock_concentration=float(row["_stock_canon"]),
            mastermix_target_concentration=float(row["_target_canon"]),
            total_mastermix_volume_ul=float(total_mastermix_volume_ul),
            min_dye_handling_volume_ul=float(min_dye_handling_volume_ul),
        )
        for key, value in plan.items():
            df.at[idx, key] = value

    df["effective_addition_volume_ul"] = pd.to_numeric(
        df["dye_stock_volume_ul"], errors="coerce"
    )

    mask = df["needs_intermediate"]
    df.loc[mask, "effective_addition_volume_ul"] = (
        pd.to_numeric(df.loc[mask, "intermediate_transfer_ul"], errors="coerce")
        .astype(float)
        .to_numpy()
    )

    total_addition_ul = float(df["effective_addition_volume_ul"].sum())
    diluent_ul = float(total_mastermix_volume_ul - total_addition_ul)

    if diluent_ul < 0:
        raise ValueError(
            f"Dye additions exceed total mastermix volume for dye_program '{dye_program}'"
        )

    return df.reset_index(drop=True)


def build_all_dye_recipes(
    merged_df: pd.DataFrame,
    meta_dye_df: pd.DataFrame,
    final_well_volume_ul: float,
    mastermix_dispense_ul_per_well: float,
    overage_fraction: float,
    min_dye_handling_volume_ul: float,
    dead_volume_dye_ul: float = 0.0,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    program_summary = build_dye_program_summary(
        merged_df=merged_df,
        mastermix_dispense_ul_per_well=mastermix_dispense_ul_per_well,
        overage_fraction=overage_fraction,
        dead_volume_dye_ul=dead_volume_dye_ul,
    )

    meta_with_targets = add_2x_mastermix_targets(
        meta_dye_df=meta_dye_df,
        final_well_volume_ul=final_well_volume_ul,
        mastermix_dispense_ul_per_well=mastermix_dispense_ul_per_well,
    )

    recipe_frames = []
    for idx, row in program_summary.iterrows():
        dye_program = row["dye_program"]
        total_mastermix_volume_ul = float(row["total_mastermix_volume_ul"])

        recipe_df = calculate_dye_recipe_for_program(
            dye_program=dye_program,
            program_meta_df=meta_with_targets,
            total_mastermix_volume_ul=total_mastermix_volume_ul,
            min_dye_handling_volume_ul=min_dye_handling_volume_ul,
        )

        final_diluent_ul = float(
            total_mastermix_volume_ul - recipe_df["effective_addition_volume_ul"].sum()
        )
        program_summary.loc[idx, "final_diluent_volume_ul"] = final_diluent_ul

        recipe_frames.append(recipe_df)

    if recipe_frames:
        recipes = pd.concat(recipe_frames, ignore_index=True)
    else:
        recipes = pd.DataFrame()

    return program_summary, recipes