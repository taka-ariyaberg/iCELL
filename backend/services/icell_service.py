"""Wrapper service for iCELL calculations."""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Optional

import pandas as pd

# Add the resource directory to path so we can import iCELL in source and bundled modes.
RESOURCE_ROOT = Path(
    os.environ.get("ICELL_RESOURCE_ROOT", Path(__file__).parent.parent.parent)
).resolve()
RUNTIME_ROOT = Path(os.environ.get("ICELL_RUNTIME_ROOT", RESOURCE_ROOT)).resolve()
sys.path.insert(0, str(RESOURCE_ROOT / "src"))

from ..api.schemas import SeededConfigInput, PlateLayoutInput


def _ensure_custom_plate_type(plate_type: str) -> str:
    """Create a plate type JSON file for custom dimensions (e.g., '6,9'). Returns the mapped name."""
    if "," not in plate_type:
        return plate_type  # Not a custom format
    
    try:
        rows_str, cols_str = plate_type.split(',')
        rows_num = int(rows_str.strip())
        cols_num = int(cols_str.strip())
        
        # Generate row labels (A, B, C, ... Z, AA, AB, ...)
        rows = []
        for i in range(rows_num):
            if i < 26:
                rows.append(chr(65 + i))
            else:
                rows.append(chr(65 + (i // 26) - 1) + chr(65 + (i % 26)))
        
        # Generate column numbers
        cols = list(range(1, cols_num + 1))
        
        # Create plate type config
        plate_config = {
            "name": f"Custom {rows_num}×{cols_num} plate",
            "description": f"Custom plate: {rows_num} rows × {cols_num} columns",
            "rows": rows,
            "columns": cols
        }
        
        # Save to the writable runtime config directory with custom format name
        custom_name = f"custom_{rows_num}x{cols_num}"
        plate_type_file = RUNTIME_ROOT / "config" / "plate_type" / f"{custom_name}.json"
        plate_type_file.parent.mkdir(parents=True, exist_ok=True)
        plate_type_file.write_text(json.dumps(plate_config, indent=2))
        
        return custom_name
    except (ValueError, IndexError):
        # Invalid custom format, pass through as-is and let it fail later in iCELL
        return plate_type


def create_temp_config(config_input: SeededConfigInput) -> Dict:
    """Convert frontend config input to iCELL config format."""
    
    # Map standard plate types and pass through others (including custom format like "6,9")
    plate_config_map = {
        "6_well": "6_well",
        "12_well": "12_well",
        "24_well": "24_well",
        "48_well": "48_well",
        "96_well": "96_well",
        "384_well": "384_well",
        "1536_well": "1536_well"
    }
    
    # Handle custom plate types (format: "rows,cols" e.g., "6,9")
    plate_type = config_input.plate_type
    if "," in plate_type:
        _ensure_custom_plate_type(plate_type)
        # Map custom format to the file we just created
        plate_type = f"custom_{plate_type.replace(',', 'x')}"
    
    # Use provided dead volumes or defaults
    dead_volume_cells = config_input.dead_volume_cells_ul or 2000.0
    dead_volume_dye = config_input.dead_volume_dye_ul or 500.0
    final_volume = config_input.final_well_volume_ul or 40.0
    
    # Calculate dispense volumes based on mode
    if config_input.mode == "no_dye":
        # No dye: all volume from cell suspension
        cell_dispense = final_volume
        dye_dispense = 0.0
    else:
        # With dye: split equally (2X master mix approach)
        cell_dispense = final_volume / 2.0
        dye_dispense = final_volume / 2.0
    
    return {
        "project": {
            "name": config_input.project_name,
            "run_name": config_input.run_name
        },
        "mode": config_input.mode,
        "plate_type": plate_type,
        "num_plates": config_input.num_plates,
        "dead_volume": {
            "cell_suspension_ul": dead_volume_cells,
            "dye_ul": dead_volume_dye
        },
        "seeding_modes": {
            "no_dye": {
                "final_well_volume_ul": final_volume,
                "cell_suspension_dispense_ul": cell_dispense,
                "media_dispense_ul": 0.0,
                "dye_mastermix_dispense_ul_per_well": 0.0,
                "description": f"Full {final_volume} µL well with cell suspension only (no dye)"
            },
            "dye": {
                "final_well_volume_ul": final_volume,
                "cell_suspension_dispense_ul": cell_dispense,
                "media_dispense_ul": 0.0,
                "dye_mastermix_dispense_ul_per_well": dye_dispense,
                "description": f"{cell_dispense} µL cell suspension + {dye_dispense} µL dye mastermix"
            }
        },
        "seeding": {
            "final_well_volume_ul": final_volume,
            "cell_suspension_dispense_ul": cell_dispense,
            "media_dispense_ul": 0.0,
            "stock_cell_concentration_cells_per_ml": config_input.stock_cell_concentration,
            "min_cell_handling_volume_ul": 20.0,
            "overage_fraction": config_input.overage_fraction
        },
        "dye": {
            "enabled": config_input.mode == "dye",
            "meta_dye_csv": "meta_dye.csv",
            "mastermix_dispense_ul_per_well": dye_dispense,
            "min_dye_handling_volume_ul": 1.0
        },
        "paths": {
            "input_dir": str(RUNTIME_ROOT / "data" / "input"),
            "cell_layout_csv": "cell_layout.csv",
            "dye_layout_csv": "dye_layout.csv",
            "output_tables_dir": str(RUNTIME_ROOT / "data" / "output" / "tables"),
            "output_instructions_dir": str(RUNTIME_ROOT / "data" / "output" / "instructions"),
            "output_logs_dir": str(RUNTIME_ROOT / "data" / "output" / "logs")
        }
    }


def create_cell_layout_csv(plate_layout: PlateLayoutInput) -> str:
    """Convert frontend plate layout to CSV format."""
    
    # Determine plate dimensions from well positions
    letters = set()
    columns = set()
    
    for well_pos in plate_layout.well_positions.keys():
        # Parse A1, B2, etc.
        letters.add(well_pos[0])
        columns.add(int(well_pos[1:]))
    
    sorted_letters = sorted(letters)
    sorted_columns = sorted(columns)
    
    rows_data = []
    for letter in sorted_letters:
        row = {"row_name": letter}
        for col in sorted_columns:
            well = f"{letter}{col}"
            row[str(col)] = plate_layout.well_positions.get(well, "")
        rows_data.append(row)
    
    df = pd.DataFrame(rows_data)
    return df.to_csv(index=False)


def create_dye_layout_csv(plate_layout: PlateLayoutInput) -> Optional[str]:
    """Convert frontend dye layout to CSV format."""
    
    if not plate_layout.dye_programs:
        return None
    
    # Determine plate dimensions
    letters = set()
    columns = set()
    
    for well_pos in plate_layout.dye_programs.keys():
        letters.add(well_pos[0])
        columns.add(int(well_pos[1:]))
    
    sorted_letters = sorted(letters)
    sorted_columns = sorted(columns)
    
    rows_data = []
    for letter in sorted_letters:
        row = {"row_name": letter}
        for col in sorted_columns:
            well = f"{letter}{col}"
            row[str(col)] = plate_layout.dye_programs.get(well, "")
        rows_data.append(row)
    
    df = pd.DataFrame(rows_data)
    return df.to_csv(index=False)


def create_meta_dye_csv(programs: list) -> str:
    """Convert frontend dye program definitions to meta_dye.csv format expected by iCELL."""
    rows = []
    for program in programs:
        for dye in program.dyes:
            rows.append({
                "dye_program": program.name,
                "dye_name": dye.dye_name,
                "stock_concentration": dye.stock_concentration,
                "stock_concentration_unit": dye.stock_concentration_unit,
                "final_concentration": dye.final_concentration,
                "final_concentration_unit": dye.final_concentration_unit,
            })
    df = pd.DataFrame(rows)
    return df.to_csv(index=False)


def run_icell_calculation(config_input: SeededConfigInput, plate_layout: PlateLayoutInput) -> Dict:
    """
    Run iCELL calculation with provided configuration and plate layout.
    
    Returns a dictionary with status, instructions, tables, etc.
    """
    
    try:
        # Create temporary config and CSVs in memory
        config_dict = create_temp_config(config_input)
        cell_layout_csv = create_cell_layout_csv(plate_layout)
        dye_layout_csv = create_dye_layout_csv(plate_layout)
        
        # Save to temp location for iCELL to read
        temp_dir = RUNTIME_ROOT / "data" / "input"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        temp_cell_file = temp_dir / "temp_cell_layout.csv"
        temp_cell_file.write_text(cell_layout_csv)
        
        if dye_layout_csv:
            temp_dye_file = temp_dir / "temp_dye_layout.csv"
            temp_dye_file.write_text(dye_layout_csv)
            config_dict["paths"]["dye_layout_csv"] = "temp_dye_layout.csv"

        # Generate meta_dye.csv from the dye program definitions provided by the UI
        if config_dict["dye"]["enabled"]:
            if not plate_layout.meta_dye_programs:
                return {
                    "status": "error",
                    "error": "Dye mode is enabled but no dye programs are defined. Please define your dye programs in the Configuration step before processing.",
                    "instructions": "",
                    "seeding_summary": [],
                    "dye_summary": []
                }
            meta_dye_csv = create_meta_dye_csv(plate_layout.meta_dye_programs)
            temp_meta_dye_file = temp_dir / "temp_meta_dye.csv"
            temp_meta_dye_file.write_text(meta_dye_csv)
            config_dict["dye"]["meta_dye_csv"] = "temp_meta_dye.csv"

        config_dict["paths"]["cell_layout_csv"] = "temp_cell_layout.csv"
        
        # Save config and run iCELL
        temp_config_file = temp_dir / "temp_config.json"
        temp_config_file.write_text(json.dumps(config_dict))
        
        # Import and run iCELL
        from icell.main import run_icell
        
        results = run_icell(str(temp_config_file))
        
        # Convert DataFrames to JSON-serializable dicts
        return {
            "status": "success",
            "instructions": results.get("instructions_text", ""),
            "seeding_summary": results.get("seeding_summary_df", pd.DataFrame()).to_dict(orient="records"),
            "dye_summary": results.get("dye_program_summary_df", pd.DataFrame()).to_dict(orient="records"),
            "seeded_layout": results.get("seeded_layout_df", pd.DataFrame()).to_dict(orient="records")
        }
    
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "instructions": "",
            "seeding_summary": [],
            "dye_summary": []
        }
