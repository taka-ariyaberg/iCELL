from __future__ import annotations

import unittest
from pathlib import Path

from backend.api.routes import _normalize_uploaded_config
from backend.api.schemas import PlateLayoutInput, SeededConfigInput
from backend.services.icell_service import run_icell_calculation


class UploadConfigNormalizationTests(unittest.TestCase):
    """Guards the file-import round-trip: an uploaded config carrying group
    identity + cell metadata must survive normalization so the engine can
    reproduce the same run (group names via well_groups, cell metadata via
    cell_groups). Regression guard for the results-page re-import export."""

    def test_normalize_preserves_well_groups_and_cell_groups(self) -> None:
        cfg = {
            "project": {"name": "p", "plate_id": "P1"},
            "mode": "no_dye",
            "well_groups": {"A1": "Control", "A2": "Treated"},
            "cell_groups": {
                "Control": {"cell_line": "HeLa", "modification": "Wildtype", "passage": "P12", "viability_percent": 95},
                "Treated": {"cell_line": "HeLa", "modification": "KRAS-KO", "passage": "P13", "viability_percent": 88},
            },
        }
        out = _normalize_uploaded_config(cfg, Path("/tmp/icell-test"), has_dye_layout=False, has_meta_dye=False)
        self.assertEqual(out["well_groups"], {"A1": "Control", "A2": "Treated"})
        self.assertEqual(out["cell_groups"]["Control"]["cell_line"], "HeLa")
        self.assertEqual(out["cell_groups"]["Treated"]["modification"], "KRAS-KO")
        self.assertEqual(out["cell_groups"]["Control"]["viability_percent"], 95)


class ICellServiceTests(unittest.TestCase):
    def test_run_calculation_returns_renamed_imeta_concentration_columns(self) -> None:
        config = SeededConfigInput(
            project_name="Test",
            plate_id="P1",
            plate_type="96_well",
            mode="no_dye",
            stock_cell_concentration=5_000_000,
            overage_fraction=0.3,
            num_plates=1,
            seeding_date="2026-04-23",
        )
        plate_layout = PlateLayoutInput(
            well_positions={"A1": 1000},
            well_groups={"A1": "Control"},
        )

        result = run_icell_calculation(config, plate_layout)

        self.assertEqual(result["status"], "success")
        self.assertEqual(len(result["imeta_rows"]), 1)

        row = result["imeta_rows"][0]
        self.assertIn("stock_cell_suspension_concentration_cells/mL", row)
        self.assertIn("working_cell_suspension_concentration_cells/mL", row)
        self.assertNotIn("initial_cell_suspension_concentration_cells/mL", row)
        self.assertNotIn("cell_suspension_concentration_cells/mL", row)

    def test_group_definitions_appear_in_imeta_rows(self) -> None:
        config = SeededConfigInput(
            project_name="p", plate_id="P1", plate_type="96_well", mode="no_dye",
            stock_cell_concentration=5_000_000,
        )
        plate_layout = PlateLayoutInput(
            well_positions={"A1": 500},
            well_groups={"A1": "Control"},
            group_definitions={"Control": {
                "cell_line": "HeLa", "modification": "Wildtype",
                "passage": "P12", "viability_percent": 95,
            }},
        )
        result = run_icell_calculation(config, plate_layout)
        self.assertEqual(result["status"], "success")
        row = result["imeta_rows"][0]
        self.assertEqual(row["cell_line"], "HeLa")
        self.assertEqual(row["cell_modification"], "Wildtype")
        self.assertEqual(row["passage"], "P12")
        self.assertEqual(str(row["viability_percent"]), "95")


if __name__ == "__main__":
    unittest.main()
