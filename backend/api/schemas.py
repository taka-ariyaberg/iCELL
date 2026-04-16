"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class SeededConfigInput(BaseModel):
    """Configuration input from frontend."""
    project_name: str = Field(..., description="Project name")
    plate_id: str = Field(..., description="Plate identifier")
    run_name: Optional[str] = Field(default=None, description="Deprecated alias for plate_id")
    plate_type: str = Field(..., description="96_well, 384_well, 1536_well, or custom like 6,9")
    mode: str = Field(..., description="no_dye or dye")
    stock_cell_concentration: int = Field(..., description="Stock concentration in cells/mL")
    overage_fraction: float = Field(default=0.3, description="Overage as decimal (0.3 = 30%)")
    num_plates: int = Field(default=1, description="Number of plates")
    seeding_date: Optional[str] = Field(default=None, description="Optional seeding date in YYYY-MM-DD format")
    final_well_volume_ul: Optional[float] = Field(default=40.0, description="Total volume per well in µL")
    dead_volume_cells_ul: Optional[float] = Field(default=2000.0, description="Dead volume for cell suspension in µL")
    dead_volume_dye_ul: Optional[float] = Field(default=500.0, description="Dead volume for dye in µL")


class DyeDefinitionInput(BaseModel):
    """A single dye within a dye program, as defined in the UI."""
    dye_name: str = Field(..., description="Dye name (e.g. 'Hoechst_33342')")
    stock_concentration: float = Field(..., description="Stock concentration value")
    stock_concentration_unit: str = Field(..., description="Stock concentration unit (e.g. 'uM', 'ug_per_ml')")
    final_concentration: float = Field(..., description="Final concentration value")
    final_concentration_unit: str = Field(..., description="Final concentration unit")


class DyeProgramInput(BaseModel):
    """A named dye program (e.g. 'LCP') with its component dyes, as defined in the UI."""
    name: str = Field(..., description="Dye program name (e.g. 'LCP')")
    dyes: List[DyeDefinitionInput] = Field(default_factory=list, description="Dye definitions in this program")


class PlateLayoutInput(BaseModel):
    """Plate layout data from frontend."""
    well_positions: Dict[str, int] = Field(..., description="Well positions and cell counts e.g. A1: 500")
    well_groups: Optional[Dict[str, str]] = Field(None, description="Optional well to group-name mapping e.g. A1: Control")
    dye_programs: Optional[Dict[str, str]] = Field(None, description="Optional dye programs per well e.g. B2: CP_A")
    meta_dye_programs: Optional[List[DyeProgramInput]] = Field(None, description="Full dye program definitions (concentrations, units) from the Configuration UI")


class RunRequest(BaseModel):
    """Complete request to run iCELL."""
    config: SeededConfigInput
    plates: PlateLayoutInput


class CalculationResult(BaseModel):
    """Results returned from calculation."""
    status: str
    instructions: str
    seeding_summary: List[Dict] = []
    dye_summary: List[Dict] = []
    formatted_seeding_summary: List[Dict] = []
    formatted_dye_summary: List[Dict] = []
    imeta_rows: List[Dict] = []
    seeded_layout: Optional[List[Dict]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
