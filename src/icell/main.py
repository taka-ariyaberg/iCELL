from __future__ import annotations

from pathlib import Path

import pandas as pd

from icell.config.loader import load_config
from icell.io.readers import read_meta_dye_csv
from icell.paths import PROJECT_ROOT, ensure_output_dirs
from icell.processing.dye_mastermix import build_all_dye_recipes
from icell.processing.layout_parser import (
    apply_well_groups,
    get_seeded_wells,
    load_cell_layout_csv,
    load_dye_layout_csv,
    merge_cell_and_dye_layout,
)
from icell.processing.seeding import add_seeding_calculations, summarize_seeding_groups
from icell.processing.validation import (
    validate_cell_layout_df,
    validate_config,
    validate_dye_file_if_needed,
    validate_dye_layout_df,
    validate_dye_programs_match,
    validate_meta_dye_df,
)
from icell.reporting.export import export_run_outputs
from icell.reporting.formatted_exports import (
    build_export_file_base,
    build_formatted_dye_summary_dataframe,
    build_formatted_seeding_summary_dataframe,
)
from icell.reporting.imeta import build_imeta_dataframe
from icell.reporting.instructions import build_all_instructions
from icell.reporting.run_log import build_run_log_text, write_run_log


def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def run_icell(config_path: str | None = None) -> dict:
    config = load_config(config_path)
    validate_config(config)
    validate_dye_file_if_needed(config)
    ensure_output_dirs()

    cell_layout_path = _resolve(config["paths"]["cell_layout_csv"])
    cell_df = load_cell_layout_csv(str(cell_layout_path))
    validate_cell_layout_df(cell_df)

    dye_df = None
    meta_dye_df = None
    dye_program_summary_df = pd.DataFrame()
    dye_recipe_df = pd.DataFrame()
    imeta_df = pd.DataFrame()
    formatted_seeding_summary_df = pd.DataFrame()
    formatted_dye_summary_df = pd.DataFrame()

    if bool(config["dye"]["enabled"]):
        dye_layout_path = _resolve(config["paths"]["dye_layout_csv"])
        meta_dye_path = _resolve(config["dye"]["meta_dye_csv"])

        dye_df = load_dye_layout_csv(str(dye_layout_path))
        validate_dye_layout_df(dye_df=dye_df, cell_df=cell_df)

        meta_dye_df = read_meta_dye_csv(meta_dye_path)
        validate_meta_dye_df(meta_dye_df)
        validate_dye_programs_match(dye_df, meta_dye_df)

    merged_df = merge_cell_and_dye_layout(cell_df=cell_df, dye_df=dye_df, num_plates=config["num_plates"])
    merged_df = apply_well_groups(merged_df, config.get("well_groups"))

    seeded_df = get_seeded_wells(merged_df)
    seeded_df = add_seeding_calculations(
        df_seeded=seeded_df,
        final_well_volume_ul=config["seeding"]["final_well_volume_ul"],
        default_cell_suspension_dispense_ul=config["seeding"]["cell_suspension_dispense_ul"],
        dye_enabled=bool(config["dye"]["enabled"]),
    )

    seeding_summary_df = summarize_seeding_groups(
        df_seeded=seeded_df,
        overage_fraction=config["seeding"]["overage_fraction"],
        dead_volume_cell_suspension_ul=config["dead_volume"]["cell_suspension_ul"],
    )

    if bool(config["dye"]["enabled"]):
        dye_program_summary_df, dye_recipe_df = build_all_dye_recipes(
            merged_df=merged_df,
            meta_dye_df=meta_dye_df,
            final_well_volume_ul=config["seeding"]["final_well_volume_ul"],
            mastermix_dispense_ul_per_well=config["dye"]["mastermix_dispense_ul_per_well"],
            overage_fraction=config["seeding"]["overage_fraction"],
            min_dye_handling_volume_ul=config["dye"]["min_dye_handling_volume_ul"],
            dead_volume_dye_ul=config["dead_volume"]["dye_ul"],
        )

    imeta_df = build_imeta_dataframe(
        config=config,
        seeded_layout_df=seeded_df,
        dye_program_summary_df=dye_program_summary_df,
        dye_recipe_df=dye_recipe_df,
    )
    formatted_seeding_summary_df = build_formatted_seeding_summary_dataframe(
        config=config,
        seeding_summary_df=seeding_summary_df,
    )
    formatted_dye_summary_df = build_formatted_dye_summary_dataframe(
        config=config,
        dye_program_summary_df=dye_program_summary_df,
        dye_recipe_df=dye_recipe_df,
    )

    instructions_text = build_all_instructions(
        config=config,
        merged_layout_df=merged_df,
        seeding_summary_df=seeding_summary_df,
        dye_program_summary_df=dye_program_summary_df,
        dye_recipe_df=dye_recipe_df,
    )

    written_files = export_run_outputs(
        config=config,
        merged_layout_df=merged_df,
        seeded_layout_df=seeded_df,
        formatted_seeding_summary_df=formatted_seeding_summary_df,
        output_tables_dir=_resolve(config["paths"]["output_tables_dir"]),
        formatted_dye_program_summary_df=formatted_dye_summary_df,
        dye_recipe_df=dye_recipe_df,
        imeta_df=imeta_df,
        instructions_text=instructions_text,
        output_instructions_dir=_resolve(config["paths"]["output_instructions_dir"]),
    )

    log_output_path = (
        _resolve(config["paths"]["output_logs_dir"])
        / f"{build_export_file_base(config)}__run_log.txt"
    )

    log_text = build_run_log_text(
        config=config,
        merged_layout_df=merged_df,
        seeded_layout_df=seeded_df,
        seeding_summary_df=seeding_summary_df,
        dye_program_summary_df=dye_program_summary_df,
        dye_recipe_df=dye_recipe_df,
        written_files=written_files,
        instructions_text=instructions_text,
    )
    write_run_log(log_text, log_output_path)
    written_files["run_log_txt"] = str(log_output_path)

    return {
        "config": config,
        "cell_layout_df": cell_df,
        "merged_layout_df": merged_df,
        "seeded_layout_df": seeded_df,
        "seeding_summary_df": seeding_summary_df,
        "dye_program_summary_df": dye_program_summary_df,
        "dye_recipe_df": dye_recipe_df,
        "imeta_df": imeta_df,
        "formatted_seeding_summary_df": formatted_seeding_summary_df,
        "formatted_dye_summary_df": formatted_dye_summary_df,
        "instructions_text": instructions_text,
        "written_files": written_files,
    }
