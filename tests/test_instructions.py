from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from icell.reporting.instructions import build_dye_prep_instructions


class InstructionBuilderTests(unittest.TestCase):
    def test_build_dye_prep_instructions_prioritizes_mastermix_protocol_wording(self) -> None:
        dye_program_summary_df = pd.DataFrame(
            [
                {
                    "dye_program": "CP_FULL",
                    "n_wells": 4,
                    "wells": "A01, A02, A03, A04",
                    "total_mastermix_volume_ul": 120.0,
                    "final_diluent_volume_ul": 116.4,
                }
            ]
        )
        dye_recipe_df = pd.DataFrame(
            [
                {
                    "dye_program": "CP_FULL",
                    "dye_name": "WGA",
                    "stock_concentration": 1000.0,
                    "stock_concentration_unit": "X",
                    "final_concentration": 1.0,
                    "final_concentration_unit": "X",
                    "mastermix_target_concentration": 2.0,
                    "dye_stock_volume_ul": 1.6,
                    "needs_intermediate": False,
                    "effective_addition_volume_ul": 1.6,
                },
                {
                    "dye_program": "CP_FULL",
                    "dye_name": "Hoechst 33342",
                    "stock_concentration": 1000.0,
                    "stock_concentration_unit": "X",
                    "final_concentration": 1.0,
                    "final_concentration_unit": "X",
                    "mastermix_target_concentration": 2.0,
                    "dye_stock_volume_ul": 0.2,
                    "needs_intermediate": True,
                    "intermediate_transfer_ul": 2.0,
                    "intermediate_stock_volume_ul": 1.0,
                    "intermediate_diluent_volume_ul": 9.0,
                    "effective_addition_volume_ul": 2.0,
                },
            ]
        )

        lines = build_dye_prep_instructions(
            dye_program_summary_df=dye_program_summary_df,
            dye_recipe_df=dye_recipe_df,
            min_dye_handling_volume_ul=1.0,
            mastermix_dispense_ul_per_well=20.0,
            final_well_volume_ul=40.0,
        )
        text = "\n".join(lines)

        self.assertIn("- Diluent", text)
        self.assertIn("Add 116.4 uL of media to the mastermix vessel.", text)
        self.assertIn("- WGA: mastermix target concentration 2 X", text)
        self.assertIn("Add 1.6 uL from stock (1000 X) to the diluent.", text)
        self.assertIn("- Hoechst 33342: mastermix target concentration 2 X", text)
        self.assertIn(
            "Prepare dye intermediate: mix 1.0 uL of Hoechst 33342 stock (1000 X) with 9.0 uL of media.",
            text,
        )
        self.assertIn(
            "Add 2.0 uL of this intermediate to the diluent.",
            text,
        )
        self.assertNotIn("target final concentration", text)
        self.assertNotIn("media/diluent", text)


if __name__ == "__main__":
    unittest.main()
