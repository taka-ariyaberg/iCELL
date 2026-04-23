from __future__ import annotations

import unittest

from backend.api.schemas import PlateLayoutInput, SeededConfigInput
from backend.services.icell_service import run_icell_calculation


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


if __name__ == "__main__":
    unittest.main()
