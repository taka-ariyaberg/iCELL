"""API routes for iCELL calculations."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
import json
import math
from pathlib import Path

import pandas as pd

from .schemas import RunRequest, CalculationResult, HealthResponse
from ..services.icell_service import run_icell_calculation


def clean_values(obj):
    """Recursively clean NaN and inf values from objects for JSON serialization."""
    if isinstance(obj, dict):
        return {k: clean_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_values(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj


router = APIRouter(prefix="/api", tags=["icell"])


def _infer_plate_type(config_data: dict) -> str:
    plate_type = config_data.get("plate_type")
    if plate_type:
        return str(plate_type)

    plate = config_data.get("plate", {})
    rows = plate.get("rows") or []
    columns = plate.get("columns") or []
    if rows and columns:
        dims = (len(rows), len(columns))
        standard = {
            (2, 3): "6_well",
            (3, 4): "12_well",
            (4, 6): "24_well",
            (6, 8): "48_well",
            (8, 12): "96_well",
            (16, 24): "384_well",
            (32, 48): "1536_well",
        }
        return standard.get(dims, f"{dims[0]},{dims[1]}")

    return "384_well"


def _normalize_uploaded_config(
    config_data: dict,
    temp_path: Path,
    has_dye_layout: bool,
    has_meta_dye: bool,
) -> dict:
    normalized = dict(config_data)
    normalized.setdefault("project", {})
    normalized["project"].setdefault("name", normalized["project"].get("name", "iCELL"))
    normalized["project"].setdefault("run_name", normalized["project"].get("run_name", "uploaded_run"))
    normalized.setdefault("mode", "no_dye")
    normalized.setdefault("num_plates", 1)
    normalized.setdefault("dead_volume", {})
    normalized["dead_volume"].setdefault("cell_suspension_ul", 2000.0)
    normalized["dead_volume"].setdefault("dye_ul", 500.0)
    normalized["plate_type"] = _infer_plate_type(normalized)

    normalized.setdefault("seeding", {})
    normalized["seeding"].setdefault("final_well_volume_ul", 40.0)
    normalized["seeding"].setdefault(
        "cell_suspension_dispense_ul",
        20.0 if normalized["mode"] == "dye" else normalized["seeding"]["final_well_volume_ul"],
    )
    normalized["seeding"].setdefault("media_dispense_ul", 0.0)
    normalized["seeding"].setdefault("stock_cell_concentration_cells_per_ml", 5000000)
    normalized["seeding"].setdefault("min_cell_handling_volume_ul", 20.0)
    normalized["seeding"].setdefault("overage_fraction", 0.30)

    normalized.setdefault("seeding_modes", {
        "no_dye": {
            "final_well_volume_ul": normalized["seeding"]["final_well_volume_ul"],
            "cell_suspension_dispense_ul": normalized["seeding"]["final_well_volume_ul"],
            "media_dispense_ul": 0.0,
            "dye_mastermix_dispense_ul_per_well": 0.0,
            "description": "Full well with cell suspension only (no dye)",
        },
        "dye": {
            "final_well_volume_ul": normalized["seeding"]["final_well_volume_ul"],
            "cell_suspension_dispense_ul": normalized["seeding"]["final_well_volume_ul"] / 2.0,
            "media_dispense_ul": 0.0,
            "dye_mastermix_dispense_ul_per_well": normalized["seeding"]["final_well_volume_ul"] / 2.0,
            "description": "Split cell suspension and dye mastermix",
        },
    })

    normalized.setdefault("dye", {})
    normalized["dye"]["enabled"] = bool(normalized["mode"] == "dye")
    normalized["dye"].setdefault(
        "mastermix_dispense_ul_per_well",
        normalized["seeding"]["final_well_volume_ul"] / 2.0,
    )
    normalized["dye"].setdefault("min_dye_handling_volume_ul", 1.0)

    normalized["paths"] = dict(normalized.get("paths", {}))
    normalized["paths"]["input_dir"] = str(temp_path)
    normalized["paths"]["cell_layout_csv"] = "cell_layout.csv"
    normalized["paths"]["dye_layout_csv"] = "dye_layout.csv"
    normalized["dye"]["meta_dye_csv"] = "meta_dye.csv"

    normalized["paths"].setdefault("output_tables_dir", "data/output/tables")
    normalized["paths"].setdefault("output_instructions_dir", "data/output/instructions")
    normalized["paths"].setdefault("output_logs_dir", "data/output/logs")

    if normalized["mode"] != "dye":
        normalized["dye"]["enabled"] = False
    if not has_dye_layout:
        normalized["paths"]["dye_layout_csv"] = "dye_layout.csv"
    if not has_meta_dye:
        normalized["dye"]["meta_dye_csv"] = "meta_dye.csv"

    return normalized


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/run", response_model=CalculationResult)
async def run_calculation(request: RunRequest):
    """
    Run iCELL calculation with provided configuration and plate layout.
    
    Parameters:
    - config: Configuration (project info, mode, concentrations, etc.)
    - plates: Plate layout with well positions and cell counts
    
    Returns:
    - Instructions and summary tables
    """
    
    result = run_icell_calculation(request.config, request.plates)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    # Clean NaN/inf values for JSON serialization
    seeding_summary = clean_values(result.get("seeding_summary", []))
    dye_summary = clean_values(result.get("dye_summary", []))
    
    return CalculationResult(
        status=result["status"],
        instructions=result.get("instructions", ""),
        seeding_summary=seeding_summary,
        dye_summary=dye_summary
    )


@router.post("/upload-csv", response_model=CalculationResult)
async def upload_csv_files(
    config_file: UploadFile = File(..., description="config.json"),
    cell_layout: UploadFile = File(..., description="cell_layout.csv"),
    dye_layout: Optional[UploadFile] = File(None, description="dye_layout.csv (optional)"),
    meta_dye: Optional[UploadFile] = File(None, description="meta_dye.csv (optional)")
):
    """
    Upload configuration and CSV files and run iCELL.
    
    This is an alternative path for users who already have their CSV files
    instead of using the interactive Designer UI.
    """
    
    try:
        from icell.main import run_icell
        
        # Create temporary directory to store uploaded files
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save config file
            config_content = await config_file.read()
            config_data = json.loads(config_content)
            config_file_path = temp_path / "config.json"
            config_file_path.write_bytes(config_content)
            
            # Save cell layout
            cell_layout_content = await cell_layout.read()
            cell_layout_path = temp_path / "cell_layout.csv"
            cell_layout_path.write_bytes(cell_layout_content)
            has_dye_layout = dye_layout is not None
            has_meta_dye = meta_dye is not None
            config_data = _normalize_uploaded_config(config_data, temp_path, has_dye_layout, has_meta_dye)
            
            # Save dye layout if provided
            if dye_layout:
                dye_layout_content = await dye_layout.read()
                dye_layout_path = temp_path / "dye_layout.csv"
                dye_layout_path.write_bytes(dye_layout_content)
            
            # Save meta_dye if provided
            if meta_dye:
                meta_dye_content = await meta_dye.read()
                meta_dye_path = temp_path / "meta_dye.csv"
                meta_dye_path.write_bytes(meta_dye_content)
            
            # Update config paths and save
            config_file_path.write_text(json.dumps(config_data, indent=2))
            
            # Run iCELL
            results = run_icell(str(config_file_path))
            
            return CalculationResult(
                status="success",
                instructions=results.get("instructions_text", ""),
                seeding_summary=results.get("seeding_summary_df", pd.DataFrame()).to_dict(orient="records"),
                dye_summary=results.get("dye_program_summary_df", pd.DataFrame()).to_dict(orient="records")
            )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
