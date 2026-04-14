from __future__ import annotations

import pandas as pd


def _fmt_ul(value: float) -> str:
    return f"{float(value):.1f} uL"


def _fmt_cells_ml(value: float) -> str:
    return f"{float(value):,.0f} cells/mL"


def build_cell_prep_instructions(
    seeding_summary_df: pd.DataFrame,
    stock_cell_concentration_cells_per_ml: float,
    min_cell_handling_volume_ul: float,
    preferred_intermediate_final_volume_ul: float = 200.0,
) -> list[str]:
    lines: list[str] = []

    if seeding_summary_df.empty:
        lines.append("No seeded wells found. No cell suspension preparation is required.")
        return lines

    lines.append("CELL SUSPENSION PREPARATION")
    lines.append("=" * 32)

    for i, row in seeding_summary_df.reset_index(drop=True).iterrows():
        target_conc = float(row["required_cell_suspension_conc_cells_per_ml"])
        total_volume_ul = float(row["total_cell_suspension_volume_ul"])
        cell_suspension_dispense_ul = float(row["cell_suspension_dispense_ul_per_well"])
        n_wells = int(row["n_wells"])
        wells = str(row["wells"])
        cells_per_well = float(row["cells_per_well"])

        direct_stock_volume_ul = (
            target_conc * total_volume_ul / float(stock_cell_concentration_cells_per_ml)
        )
        direct_media_volume_ul = total_volume_ul - direct_stock_volume_ul
        needs_intermediate = direct_stock_volume_ul < float(min_cell_handling_volume_ul)

        lines.append(
            f"{i + 1}. Cell suspension group: {int(cells_per_well)} cells/well across {n_wells} well(s) [{wells}]"
        )
        lines.append(
            f"   Dispense per well: {_fmt_ul(cell_suspension_dispense_ul)} cell suspension"
        )
        lines.append(f"   Target cell suspension concentration: {_fmt_cells_ml(target_conc)}")
        lines.append(f"   Total cell suspension needed (with overage): {_fmt_ul(total_volume_ul)}")

        if not needs_intermediate:
            lines.append("   Direct preparation from stock is acceptable.")
            lines.append(
                f"   Mix {_fmt_ul(direct_stock_volume_ul)} of stock cell suspension "
                f"({_fmt_cells_ml(stock_cell_concentration_cells_per_ml)})"
            )
            lines.append(f"   with {_fmt_ul(direct_media_volume_ul)} of media.")
            lines.append(f"   Final prepared cell suspension volume: {_fmt_ul(total_volume_ul)}")
        else:
            required_intermediate_final_volume_ul = (
                float(min_cell_handling_volume_ul)
                * float(stock_cell_concentration_cells_per_ml)
                / target_conc
            )
            intermediate_final_volume_ul = max(
                float(preferred_intermediate_final_volume_ul),
                float(int(required_intermediate_final_volume_ul + 0.999999)),
            )
            intermediate_stock_volume_ul = (
                target_conc
                * intermediate_final_volume_ul
                / float(stock_cell_concentration_cells_per_ml)
            )
            intermediate_media_volume_ul = (
                intermediate_final_volume_ul - intermediate_stock_volume_ul
            )

            lines.append(
                "   Direct preparation from stock is NOT acceptable because the required "
                f"stock cell suspension volume is below {_fmt_ul(min_cell_handling_volume_ul)}."
            )
            lines.append(
                f"   First prepare an intermediate cell suspension at {_fmt_cells_ml(target_conc)}:"
            )
            lines.append(
                f"   Mix {_fmt_ul(intermediate_stock_volume_ul)} of stock cell suspension "
                f"({_fmt_cells_ml(stock_cell_concentration_cells_per_ml)})"
            )
            lines.append(f"   with {_fmt_ul(intermediate_media_volume_ul)} of media.")
            lines.append(
                f"   This yields {_fmt_ul(intermediate_final_volume_ul)} of intermediate cell suspension."
            )
            lines.append(
                f"   Then use {_fmt_ul(total_volume_ul)} of this intermediate for the target wells."
            )

        lines.append("")

    return lines


def build_dye_prep_instructions(
    dye_program_summary_df: pd.DataFrame,
    dye_recipe_df: pd.DataFrame,
    min_dye_handling_volume_ul: float,
    mastermix_dispense_ul_per_well: float,
    final_well_volume_ul: float,
) -> list[str]:
    lines: list[str] = []

    if dye_program_summary_df.empty:
        lines.append("No dye mastermix preparation is required.")
        return lines

    lines.append("DYE MASTERMIX PREPARATION")
    lines.append("=" * 26)

    for i, summary_row in dye_program_summary_df.reset_index(drop=True).iterrows():
        dye_program = str(summary_row["dye_program"])
        n_wells = int(summary_row["n_wells"])
        wells = str(summary_row["wells"])
        total_mastermix_volume_ul = float(summary_row["total_mastermix_volume_ul"])

        lines.append(f"{i + 1}. Dye program {dye_program}: {n_wells} well(s) [{wells}]")
        lines.append(
            f"   Dispense per well: {_fmt_ul(mastermix_dispense_ul_per_well)} dye mastermix"
        )
        lines.append(
            f"   Final well volume after addition: {_fmt_ul(final_well_volume_ul)}"
        )
        lines.append(
            f"   Total mastermix volume needed (with overage): {_fmt_ul(total_mastermix_volume_ul)}"
        )

        recipe = dye_recipe_df.loc[dye_recipe_df["dye_program"] == dye_program].copy()
        if recipe.empty:
            lines.append("   No dye recipe rows found for this dye program.")
            lines.append("")
            continue

        if "final_diluent_volume_ul" in summary_row.index:
            diluent_ul = float(summary_row["final_diluent_volume_ul"])
        else:
            total_addition_ul = float(recipe["effective_addition_volume_ul"].sum())
            diluent_ul = total_mastermix_volume_ul - total_addition_ul

        if diluent_ul < 0:
            raise ValueError(f"Computed negative diluent volume for dye program {dye_program}")

        lines.append("   - Diluent")
        lines.append(
            f"     Add {_fmt_ul(diluent_ul)} of media to the mastermix vessel."
        )

        for _, dye_row in recipe.iterrows():
            dye_name = str(dye_row["dye_name"])
            stock_conc = float(dye_row["stock_concentration"])
            stock_unit = str(dye_row["stock_concentration_unit"])
            final_unit = str(dye_row["final_concentration_unit"])
            mastermix_target_conc = float(dye_row["mastermix_target_concentration"])
            stock_volume_ul = float(dye_row["dye_stock_volume_ul"])
            needs_intermediate = bool(dye_row["needs_intermediate"])

            lines.append(
                f"   - {dye_name}: mastermix target concentration {mastermix_target_conc:g} {final_unit}"
            )

            if not needs_intermediate:
                lines.append(
                    f"     Add {_fmt_ul(stock_volume_ul)} from stock ({stock_conc:g} {stock_unit}) to the diluent."
                )
            else:
                intermediate_transfer_ul = float(dye_row["intermediate_transfer_ul"])
                intermediate_stock_volume_ul = float(dye_row["intermediate_stock_volume_ul"])
                intermediate_diluent_volume_ul = float(dye_row["intermediate_diluent_volume_ul"])

                lines.append(
                    f"     Prepare dye intermediate: mix {_fmt_ul(intermediate_stock_volume_ul)} of {dye_name} stock "
                    f"({stock_conc:g} {stock_unit}) with {_fmt_ul(intermediate_diluent_volume_ul)} of media."
                )
                lines.append(
                    f"     Add {_fmt_ul(intermediate_transfer_ul)} of this intermediate to the diluent."
                )
        lines.append(
            f"   Mix well and dispense {_fmt_ul(mastermix_dispense_ul_per_well)} per assigned well."
        )
        lines.append("")

    return lines


def build_run_summary_instructions(
    config: dict,
    merged_layout_df: pd.DataFrame,
) -> list[str]:
    seeded_df = merged_layout_df.loc[merged_layout_df["seed"] == 1].copy()
    n_seeded = int(len(seeded_df))
    wells = ", ".join(seeded_df["well"].tolist()) if n_seeded > 0 else "None"

    lines = [
        "RUN SUMMARY",
        "=" * 11,
        f"Plate ID: {config['project'].get('plate_id', config['project']['run_name'])}",
        f"Seeded wells: {n_seeded}",
        f"Wells: {wells}",
        f"Final well volume: {_fmt_ul(config['seeding']['final_well_volume_ul'])}",
        f"Dye enabled: {bool(config['dye']['enabled'])}",
    ]

    if bool(config["dye"]["enabled"]):
        seeded_with_dye = merged_layout_df.loc[
            (merged_layout_df["seed"] == 1) & merged_layout_df["dye_program"].notna()
        ]
        seeded_without_dye = merged_layout_df.loc[
            (merged_layout_df["seed"] == 1) & merged_layout_df["dye_program"].isna()
        ]

        if not seeded_with_dye.empty and not seeded_without_dye.empty:
            lines.append(
                "Cell suspension dispense per dyed well: "
                f"{_fmt_ul(config['seeding']['cell_suspension_dispense_ul'])}"
            )
            lines.append(
                "Cell suspension dispense per undyed well: "
                f"{_fmt_ul(config['seeding']['final_well_volume_ul'])}"
            )
        else:
            lines.append(
                f"Cell suspension dispense per well: {_fmt_ul(config['seeding']['cell_suspension_dispense_ul'])}"
            )
        lines.append(
            f"Dye mastermix dispense per well: {_fmt_ul(config['dye']['mastermix_dispense_ul_per_well'])}"
        )
    else:
        lines.append(
            f"Cell suspension dispense per well: {_fmt_ul(config['seeding']['cell_suspension_dispense_ul'])}"
        )
        lines.append(
            f"Media dispense per well: {_fmt_ul(config['seeding']['media_dispense_ul'])}"
        )

    lines.append("")
    return lines


def build_all_instructions(
    config: dict,
    merged_layout_df: pd.DataFrame,
    seeding_summary_df: pd.DataFrame,
    dye_program_summary_df: pd.DataFrame | None = None,
    dye_recipe_df: pd.DataFrame | None = None,
) -> str:
    lines: list[str] = []

    lines.extend(build_run_summary_instructions(config, merged_layout_df))
    lines.extend(
        build_cell_prep_instructions(
            seeding_summary_df=seeding_summary_df,
            stock_cell_concentration_cells_per_ml=config["seeding"][
                "stock_cell_concentration_cells_per_ml"
            ],
            min_cell_handling_volume_ul=config["seeding"]["min_cell_handling_volume_ul"],
        )
    )

    if bool(config["dye"]["enabled"]):
        lines.append("")
        lines.extend(
            build_dye_prep_instructions(
                dye_program_summary_df=(
                    dye_program_summary_df if dye_program_summary_df is not None else pd.DataFrame()
                ),
                dye_recipe_df=(dye_recipe_df if dye_recipe_df is not None else pd.DataFrame()),
                min_dye_handling_volume_ul=config["dye"]["min_dye_handling_volume_ul"],
                mastermix_dispense_ul_per_well=config["dye"]["mastermix_dispense_ul_per_well"],
                final_well_volume_ul=config["seeding"]["final_well_volume_ul"],
            )
        )

    return "\n".join(lines).strip() + "\n"


def write_instructions(text: str, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
