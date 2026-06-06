from __future__ import annotations

import pandas as pd

from icell import __version__
from icell.reporting._format_utils import (
    _clean_text,
    _format_number,
    _is_missing,
    _normalize_header_text,
    _to_float,
)

STOCK_CELL_SUSPENSION_CONCENTRATION_COLUMN = (
    "stock_cell_suspension_concentration_cells/mL"
)
WORKING_CELL_SUSPENSION_CONCENTRATION_COLUMN = (
    "working_cell_suspension_concentration_cells/mL"
)


def _has_text(value: object) -> bool:
    return not _is_missing(value) and str(value).strip() != ""


def _cell_meta_fields(meta: dict) -> dict[str, str]:
    return {
        "cell_line": _clean_text(meta.get("cell_line")),
        "cell_modification": _clean_text(meta.get("modification")),
        "passage": _clean_text(meta.get("passage")),
        "viability_percent": _clean_text(meta.get("viability_percent")),
    }


def _format_cell_concentration_value(value: object, default: str = "") -> str:
    concentration = _to_float(value, 0.0)
    if concentration <= 0:
        return default
    return str(int(round(concentration)))


def _format_well(row_label: str, column_index: int, pad_width: int) -> str:
    return f"{row_label}{str(int(column_index)).zfill(pad_width)}"


def _component_column_name(dye_program: str, component_name: str) -> str:
    return f"{_normalize_header_text(dye_program)}_{_normalize_header_text(component_name)}"


def _component_cell_value(
    mastermix_concentration_label: str,
    addition_volume_ul_per_well: float,
) -> str:
    return (
        f"{mastermix_concentration_label} in mastermix; "
        f"{_format_number(addition_volume_ul_per_well)} uL/well"
    )


def _build_program_summary_map(
    dye_program_summary_df: pd.DataFrame | None,
) -> dict[str, dict[str, float]]:
    program_summary_map: dict[str, dict[str, float]] = {}

    if dye_program_summary_df is None or dye_program_summary_df.empty:
        return program_summary_map

    for _, row in dye_program_summary_df.iterrows():
        dye_program = _clean_text(row.get("dye_program"))
        if not dye_program:
            continue

        program_summary_map[dye_program] = {
            "mastermix_dispense_ul_per_well": _to_float(
                row.get("mastermix_dispense_ul_per_well"),
                0.0,
            ),
            "total_mastermix_volume_ul": _to_float(
                row.get("total_mastermix_volume_ul"),
                0.0,
            ),
        }

    return program_summary_map


def _build_component_value_map(
    dye_recipe_df: pd.DataFrame | None,
    program_summary_map: dict[str, dict[str, float]],
) -> tuple[dict[str, dict[str, str]], list[str]]:
    component_value_map: dict[str, dict[str, str]] = {}
    ordered_component_columns: list[str] = []
    seen_columns: set[str] = set()

    if dye_recipe_df is None or dye_recipe_df.empty:
        return component_value_map, ordered_component_columns

    for dye_program, program_df in dye_recipe_df.groupby("dye_program", sort=False, dropna=False):
        program_name = _clean_text(dye_program)
        if not program_name:
            continue

        summary = program_summary_map.get(program_name, {})
        mastermix_dispense_ul_per_well = float(
            summary.get("mastermix_dispense_ul_per_well", 0.0)
        )
        total_mastermix_volume_ul = float(summary.get("total_mastermix_volume_ul", 0.0))
        per_well_factor = 0.0
        if mastermix_dispense_ul_per_well > 0 and total_mastermix_volume_ul > 0:
            per_well_factor = mastermix_dispense_ul_per_well / total_mastermix_volume_ul

        component_values: dict[str, str] = {}
        total_component_volume_ul_per_well = 0.0

        for _, component_row in program_df.reset_index(drop=True).iterrows():
            component_name = _clean_text(component_row.get("dye_name"))
            if not component_name:
                continue

            column_name = _component_column_name(program_name, component_name)
            if column_name not in seen_columns:
                ordered_component_columns.append(column_name)
                seen_columns.add(column_name)

            mastermix_target_concentration = _to_float(
                component_row.get("mastermix_target_concentration"),
                0.0,
            )
            mastermix_target_unit = _clean_text(
                component_row.get("final_concentration_unit")
            )
            effective_addition_volume_ul = _to_float(
                component_row.get("effective_addition_volume_ul"),
                0.0,
            )
            addition_volume_ul_per_well = effective_addition_volume_ul * per_well_factor
            total_component_volume_ul_per_well += addition_volume_ul_per_well
            mastermix_concentration_label = (
                f"{_format_number(mastermix_target_concentration)} {mastermix_target_unit}"
            )

            component_values[column_name] = _component_cell_value(
                mastermix_concentration_label=mastermix_concentration_label,
                addition_volume_ul_per_well=addition_volume_ul_per_well,
            )

        diluent_column_name = _component_column_name(program_name, "Diluent")
        if diluent_column_name not in seen_columns:
            ordered_component_columns.append(diluent_column_name)
            seen_columns.add(diluent_column_name)

        diluent_volume_ul_per_well = max(
            mastermix_dispense_ul_per_well - total_component_volume_ul_per_well,
            0.0,
        )
        component_values[diluent_column_name] = _component_cell_value(
            mastermix_concentration_label="Diluent",
            addition_volume_ul_per_well=diluent_volume_ul_per_well,
        )

        component_value_map[program_name] = component_values

    return component_value_map, ordered_component_columns


def build_imeta_dataframe(
    config: dict,
    seeded_layout_df: pd.DataFrame,
    dye_program_summary_df: pd.DataFrame | None = None,
    dye_recipe_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    include_plate_number = int(config.get("num_plates", 1)) > 1
    initial_concentration_column = STOCK_CELL_SUSPENSION_CONCENTRATION_COLUMN
    per_well_concentration_column = WORKING_CELL_SUSPENSION_CONCENTRATION_COLUMN
    initial_cell_suspension_concentration = _format_cell_concentration_value(
        config.get("seeding", {}).get("stock_cell_concentration_cells_per_ml"),
    )

    base_columns = [
        "software",
        "software_version",
        "seeding_date",
        "plate_id",
        "well",
        "group",
        "cell_line",
        "cell_modification",
        "passage",
        "viability_percent",
        "seeding_density_cells_per_well",
        initial_concentration_column,
        per_well_concentration_column,
        "cell_suspension_dispense_ul_per_well",
        "dye_program",
        "dye_mastermix_dispense_ul_per_well",
    ]
    if include_plate_number:
        base_columns.insert(4, "plate_number")

    if seeded_layout_df.empty:
        return pd.DataFrame(columns=base_columns)

    project = config.get("project", {})
    user_plate_id = _clean_text(project.get("plate_id") or project.get("run_name"))
    seeding_date = _clean_text(project.get("seeding_date"))

    max_column = int(pd.to_numeric(seeded_layout_df["column"], errors="coerce").max())
    pad_width = max(2, len(str(max_column)))

    cell_groups = config.get("cell_groups") or {}

    program_summary_map = _build_program_summary_map(dye_program_summary_df)
    component_value_map, ordered_component_columns = _build_component_value_map(
        dye_recipe_df=dye_recipe_df,
        program_summary_map=program_summary_map,
    )

    rows: list[dict[str, object]] = []
    sorted_seeded = seeded_layout_df.sort_values(["plate_id", "row", "column"]).reset_index(drop=True)

    for _, seeded_row in sorted_seeded.iterrows():
        row_label = _clean_text(seeded_row.get("row"))
        column_index = int(seeded_row.get("column", 0))
        dye_program_raw = seeded_row.get("dye_program")
        has_dye_program = _has_text(dye_program_raw)
        dye_program = _clean_text(dye_program_raw, default="NONE") if has_dye_program else "NONE"
        program_summary = program_summary_map.get(dye_program, {})

        row: dict[str, object] = {
            "software": "iCELL",
            "software_version": __version__,
            "seeding_date": seeding_date,
            "plate_id": user_plate_id,
            "well": _format_well(row_label, column_index, pad_width),
            "group": _clean_text(seeded_row.get("group")),
            **_cell_meta_fields(cell_groups.get(_clean_text(seeded_row.get("group")), {})),
            "seeding_density_cells_per_well": int(float(seeded_row.get("cells_per_well", 0))),
            initial_concentration_column: initial_cell_suspension_concentration,
            per_well_concentration_column: _format_cell_concentration_value(
                seeded_row.get("required_cell_suspension_conc_cells_per_ml")
            ),
            "cell_suspension_dispense_ul_per_well": _format_number(
                _to_float(seeded_row.get("cell_suspension_dispense_ul_per_well"), 0.0)
            ),
            "dye_program": dye_program,
            "dye_mastermix_dispense_ul_per_well": _format_number(
                float(program_summary.get("mastermix_dispense_ul_per_well", 0.0))
            )
            if has_dye_program
            else "0",
        }

        if include_plate_number:
            row["plate_number"] = int(seeded_row.get("plate_id", 1))

        for component_column in ordered_component_columns:
            row[component_column] = ""

        if has_dye_program:
            for component_column, component_value in component_value_map.get(dye_program, {}).items():
                row[component_column] = component_value

        rows.append(row)

    return pd.DataFrame(rows, columns=base_columns + ordered_component_columns)


__all__ = ["build_imeta_dataframe"]
