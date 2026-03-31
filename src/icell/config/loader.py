from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from icell.paths import CONFIG_DIR, RUNTIME_CONFIG_DIR


def load_json(path: str | Path) -> dict[str, Any]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Expected top-level JSON object in {path}")
    return data


def apply_mode_preset(config: dict[str, Any]) -> dict[str, Any]:
    """Apply seeding mode preset to config based on the 'mode' setting."""
    mode = config.get("mode", "no_dye")
    
    if "seeding_modes" not in config:
        raise KeyError("Missing 'seeding_modes' section in config")
    
    seeding_modes = config["seeding_modes"]
    if mode not in seeding_modes:
        available = list(seeding_modes.keys())
        raise ValueError(
            f"Unknown mode '{mode}'. Available modes: {available}"
        )
    
    # Apply the mode preset to seeding section
    preset = seeding_modes[mode]
    config["seeding"]["final_well_volume_ul"] = preset["final_well_volume_ul"]
    config["seeding"]["cell_suspension_dispense_ul"] = preset["cell_suspension_dispense_ul"]
    config["seeding"]["media_dispense_ul"] = preset["media_dispense_ul"]
    
    # Auto-set dye.enabled based on mode
    config["dye"]["enabled"] = (mode == "dye")
    
    # If dye mode, use the dye mastermix dispense from preset
    if mode == "dye":
        config["dye"]["mastermix_dispense_ul_per_well"] = preset["dye_mastermix_dispense_ul_per_well"]
    
    return config


def resolve_input_file_paths(config: dict[str, Any], config_dir: Path) -> dict[str, Any]:
    """Resolve input file paths relative to input_dir."""
    paths = config["paths"]
    
    if "input_dir" not in paths:
        raise KeyError("Missing required config.paths.input_dir")
    
    input_dir_str = paths["input_dir"]
    input_dir_path = Path(input_dir_str)
    if not input_dir_path.is_absolute():
        input_dir_path = config_dir.parent / input_dir_path
    
    input_dir_path = input_dir_path.resolve()
    
    if not input_dir_path.exists():
        raise FileNotFoundError(f"input_dir does not exist: {input_dir_path}")
    
    # Resolve cell_layout_csv
    cell_layout_filename = str(paths["cell_layout_csv"])
    cell_layout_path = input_dir_path / cell_layout_filename
    if not cell_layout_path.exists():
        raise FileNotFoundError(
            f"cell_layout_csv not found at {cell_layout_path}\n"
            f"Expected filename: {cell_layout_filename} in input_dir: {input_dir_path}"
        )
    config["paths"]["cell_layout_csv"] = str(cell_layout_path)
    
    # Resolve dye_layout_csv only when needed
    dye_layout_filename = str(paths["dye_layout_csv"])
    dye_layout_path = input_dir_path / dye_layout_filename
    if config["dye"]["enabled"]:
        if not dye_layout_path.exists():
            raise FileNotFoundError(
                f"dye_layout_csv not found at {dye_layout_path}\n"
                f"Expected filename: {dye_layout_filename} in input_dir: {input_dir_path}"
            )
    config["paths"]["dye_layout_csv"] = str(dye_layout_path)
    
    # Resolve meta_dye_csv only when needed
    meta_dye_filename = str(config["dye"]["meta_dye_csv"])
    meta_dye_path = input_dir_path / meta_dye_filename
    if config["dye"]["enabled"]:
        if not meta_dye_path.exists():
            raise FileNotFoundError(
                f"meta_dye_csv not found at {meta_dye_path}\n"
                f"Expected filename: {meta_dye_filename} in input_dir: {input_dir_path}"
            )
    config["dye"]["meta_dye_csv"] = str(meta_dye_path)
    
    return config


def load_plate_type(config: dict[str, Any], config_dir: Path) -> dict[str, Any]:
    """Load plate type definition from plate_type file."""
    if "plate_type" not in config:
        raise KeyError("Missing required config.plate_type")
    
    plate_type_name = str(config["plate_type"])
    
    # Search writable runtime config first for custom plate types, then bundled config.
    plate_type_file = RUNTIME_CONFIG_DIR / "plate_type" / f"{plate_type_name}.json"

    if not plate_type_file.exists():
        plate_type_file = CONFIG_DIR / "plate_type" / f"{plate_type_name}.json"

    if not plate_type_file.exists():
        plate_type_file = config_dir / "plate_type" / f"{plate_type_name}.json"
    
    if not plate_type_file.exists():
        available = []
        # Check both locations for available plate types
        for search_dir in [RUNTIME_CONFIG_DIR / "plate_type", CONFIG_DIR / "plate_type", config_dir / "plate_type"]:
            if search_dir.exists():
                available.extend([f.stem for f in search_dir.glob("*.json")])
        available = sorted(set(available))  # Remove duplicates and sort
        raise FileNotFoundError(
            f"Plate type '{plate_type_name}' not found\n"
            f"Available plate types: {', '.join(available) if available else 'none found'}"
        )
    
    plate_config = load_json(plate_type_file)
    
    required_plate_keys = ["name", "description", "rows", "columns"]
    missing_keys = [key for key in required_plate_keys if key not in plate_config]
    if missing_keys:
        raise KeyError(
            f"Plate type file {plate_type_file} missing keys: {missing_keys}"
        )
    
    config["plate"] = plate_config
    return config


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    config_path = Path(path) if path else CONFIG_DIR / "config.json"
    config = load_json(config_path)

    required_top_keys = ["project", "plate_type", "mode", "num_plates", "dead_volume", "seeding_modes", "seeding", "dye", "paths"]
    missing_top = [key for key in required_top_keys if key not in config]
    if missing_top:
        raise KeyError(f"Missing required config section(s): {missing_top}")

    # Load plate type definition from separate file
    config = load_plate_type(config, config_path.parent)

    # Apply mode preset to automatically configure seeding and dye
    config = apply_mode_preset(config)

    required_path_keys = [
        "input_dir",
        "cell_layout_csv",
        "dye_layout_csv",
        "output_tables_dir",
        "output_instructions_dir",
        "output_logs_dir",
    ]
    missing_path_keys = [key for key in required_path_keys if key not in config["paths"]]
    if missing_path_keys:
        raise KeyError(f"Missing required config.paths key(s): {missing_path_keys}")

    # Resolve input file paths based on input_dir
    config = resolve_input_file_paths(config, config_path.parent)

    # Validate num_plates
    if "num_plates" not in config or config["num_plates"] < 1:
        raise ValueError("config.num_plates must be >= 1")
    
    # Validate dead_volume
    if "dead_volume" not in config:
        raise KeyError("Missing required config section: dead_volume")
    dead_vol = config["dead_volume"]
    if "cell_suspension_ul" not in dead_vol or "dye_ul" not in dead_vol:
        raise KeyError("Missing required dead_volume keys: cell_suspension_ul, dye_ul")
    if dead_vol["cell_suspension_ul"] < 0 or dead_vol["dye_ul"] < 0:
        raise ValueError("dead_volume values must be >= 0")

    required_seeding_keys = [
        "final_well_volume_ul",
        "cell_suspension_dispense_ul",
        "media_dispense_ul",
        "stock_cell_concentration_cells_per_ml",
        "min_cell_handling_volume_ul",
        "overage_fraction",
    ]
    missing_seeding_keys = [key for key in required_seeding_keys if key not in config["seeding"]]
    if missing_seeding_keys:
        raise KeyError(f"Missing required config.seeding key(s): {missing_seeding_keys}")

    required_dye_keys = [
        "enabled",
        "meta_dye_csv",
        "mastermix_dispense_ul_per_well",
        "min_dye_handling_volume_ul",
    ]
    missing_dye_keys = [key for key in required_dye_keys if key not in config["dye"]]
    if missing_dye_keys:
        raise KeyError(f"Missing required config.dye key(s): {missing_dye_keys}")

    return config
