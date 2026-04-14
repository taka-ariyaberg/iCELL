from __future__ import annotations

from datetime import datetime
import re

import pandas as pd

from icell import __version__


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


def _filename_safe(value: object, default: str) -> str:
    text = _clean_text(value, default=default)
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("._")
    return text or default


def _component_column_name(dye_program: str, component_name: str) -> str:
    return f"{_normalize_header_text(dye_program)}_{_normalize_header_text(component_name)}"


def _summary_component_value(
    mastermix_concentration_label: str,
    total_addition_volume_ul: float,
) -> str:
    return (
        f"{mastermix_concentration_label} in mastermix; "
        f"{_format_number(total_addition_volume_ul)} uL total"
    )


def build_export_file_base(config: dict, exported_at: datetime | None = None) -> str:
    project = config.get("project", {})
    when = exported_at or datetime.now()
    project_name = _filename_safe(project.get("name"), default="iCELL")
    plate_id = _filename_safe(
        project.get("plate_id") or project.get("run_name"),
        default="plate",
    )
    return f"{project_name}__{plate_id}__{when.strftime('%Y-%m-%d')}"


def build_formatted_seeding_summary_dataframe(
    config: dict,
    seeding_summary_df: pd.DataFrame,
) -> pd.DataFrame:
    optional_columns = [
        column
        for column in ["group", "cell_line", "condition"]
        if column in seeding_summary_df.columns
        and seeding_summary_df[column].astype(str).str.strip().ne("").any()
    ]

    base_columns = [
        "software",
        "software_version",
        "project_name",
        "plate_id",
        "seeding_date",
        *optional_columns,
        "seeding_density_cells_per_well",
        "cell_suspension_dispense_ul_per_well",
        "cell_suspension_concentration",
        "seeded_well_count",
        "assigned_wells",
        "base_cell_suspension_volume_ul",
        "total_cell_suspension_volume_ul",
    ]

    if seeding_summary_df.empty:
        return pd.DataFrame(columns=base_columns)

    project = config.get("project", {})
    project_name = _clean_text(project.get("name"), "iCELL")
    plate_id = _clean_text(project.get("plate_id") or project.get("run_name"))
    seeding_date = _clean_text(project.get("seeding_date"))

    rows: list[dict[str, object]] = []
    sorted_df = seeding_summary_df.sort_values(
        [column for column in ["cells_per_well", *optional_columns] if column in seeding_summary_df.columns]
    ).reset_index(drop=True)

    for _, summary_row in sorted_df.iterrows():
        row = {
            "software": "iCELL",
            "software_version": __version__,
            "project_name": project_name,
            "plate_id": plate_id,
            "seeding_date": seeding_date,
            "seeding_density_cells_per_well": int(float(summary_row["cells_per_well"])),
            "cell_suspension_dispense_ul_per_well": _format_number(
                _to_float(summary_row["cell_suspension_dispense_ul_per_well"])
            ),
            "cell_suspension_concentration": (
                f"{int(round(_to_float(summary_row['required_cell_suspension_conc_cells_per_ml'])))} cells/mL"
            ),
            "seeded_well_count": int(summary_row["n_wells"]),
            "assigned_wells": _clean_text(summary_row.get("wells")),
            "base_cell_suspension_volume_ul": _format_number(
                _to_float(summary_row["base_cell_suspension_volume_ul"])
            ),
            "total_cell_suspension_volume_ul": _format_number(
                _to_float(summary_row["total_cell_suspension_volume_ul"])
            ),
        }

        for optional_column in optional_columns:
            row[optional_column] = _clean_text(summary_row.get(optional_column))

        rows.append(row)

    return pd.DataFrame(rows, columns=base_columns)


def build_formatted_dye_summary_dataframe(
    config: dict,
    dye_program_summary_df: pd.DataFrame,
    dye_recipe_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    base_columns = [
        "software",
        "software_version",
        "project_name",
        "plate_id",
        "seeding_date",
        "dye_program",
        "assigned_well_count",
        "assigned_wells",
        "dye_mastermix_dispense_ul_per_well",
        "base_mastermix_volume_ul",
        "total_mastermix_volume_ul",
        "final_diluent_volume_ul",
    ]

    component_columns: list[str] = []
    component_value_map: dict[str, dict[str, str]] = {}

    if dye_recipe_df is not None and not dye_recipe_df.empty:
        seen_columns: set[str] = set()
        for dye_program, program_df in dye_recipe_df.groupby("dye_program", sort=False, dropna=False):
            program_name = _clean_text(dye_program)
            if not program_name:
                continue

            program_component_values: dict[str, str] = {}
            total_component_volume_ul = 0.0

            for _, component_row in program_df.reset_index(drop=True).iterrows():
                component_name = _clean_text(component_row.get("dye_name"))
                if not component_name:
                    continue

                column_name = _component_column_name(program_name, component_name)
                if column_name not in seen_columns:
                    component_columns.append(column_name)
                    seen_columns.add(column_name)

                mastermix_target_concentration = _to_float(
                    component_row.get("mastermix_target_concentration"),
                    0.0,
                )
                mastermix_target_unit = _clean_text(
                    component_row.get("final_concentration_unit")
                )
                addition_volume_ul = _to_float(
                    component_row.get("effective_addition_volume_ul"),
                    0.0,
                )
                total_component_volume_ul += addition_volume_ul
                program_component_values[column_name] = _summary_component_value(
                    mastermix_concentration_label=(
                        f"{_format_number(mastermix_target_concentration)} {mastermix_target_unit}"
                    ),
                    total_addition_volume_ul=addition_volume_ul,
                )

            diluent_column_name = _component_column_name(program_name, "Diluent")
            if diluent_column_name not in seen_columns:
                component_columns.append(diluent_column_name)
                seen_columns.add(diluent_column_name)

            total_mastermix_volume_ul = _to_float(
                program_df["total_mastermix_volume_ul"].iloc[0],
                0.0,
            )
            diluent_volume_ul = max(total_mastermix_volume_ul - total_component_volume_ul, 0.0)
            program_component_values[diluent_column_name] = _summary_component_value(
                mastermix_concentration_label="Diluent",
                total_addition_volume_ul=diluent_volume_ul,
            )
            component_value_map[program_name] = program_component_values

    all_columns = base_columns + component_columns

    if dye_program_summary_df.empty:
        return pd.DataFrame(columns=all_columns)

    project = config.get("project", {})
    project_name = _clean_text(project.get("name"), "iCELL")
    plate_id = _clean_text(project.get("plate_id") or project.get("run_name"))
    seeding_date = _clean_text(project.get("seeding_date"))

    rows: list[dict[str, object]] = []
    sorted_df = dye_program_summary_df.sort_values("dye_program").reset_index(drop=True)

    for _, summary_row in sorted_df.iterrows():
        dye_program = _clean_text(summary_row.get("dye_program"))
        row = {
            "software": "iCELL",
            "software_version": __version__,
            "project_name": project_name,
            "plate_id": plate_id,
            "seeding_date": seeding_date,
            "dye_program": dye_program,
            "assigned_well_count": int(summary_row["n_wells"]),
            "assigned_wells": _clean_text(summary_row.get("wells")),
            "dye_mastermix_dispense_ul_per_well": _format_number(
                _to_float(summary_row["mastermix_dispense_ul_per_well"])
            ),
            "base_mastermix_volume_ul": _format_number(
                _to_float(summary_row["base_mastermix_volume_ul"])
            ),
            "total_mastermix_volume_ul": _format_number(
                _to_float(summary_row["total_mastermix_volume_ul"])
            ),
            "final_diluent_volume_ul": _format_number(
                _to_float(summary_row.get("final_diluent_volume_ul"))
            ),
        }

        for component_column in component_columns:
            row[component_column] = ""

        for component_column, component_value in component_value_map.get(dye_program, {}).items():
            row[component_column] = component_value

        rows.append(row)

    return pd.DataFrame(rows, columns=all_columns)


__all__ = [
    "build_export_file_base",
    "build_formatted_dye_summary_dataframe",
    "build_formatted_seeding_summary_dataframe",
]
