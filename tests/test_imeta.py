from __future__ import annotations

import sys
import unittest
from pathlib import Path
import re

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from icell.reporting.imeta import build_imeta_dataframe


def _extract_volume(value: str) -> float:
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s+uL/well", value)
    if not match:
        raise AssertionError(f"Could not parse volume from '{value}'")
    return float(match.group(1))


class IMetaBuilderTests(unittest.TestCase):
    def test_builds_clean_one_row_per_well_imeta_export(self) -> None:
        config = {
            "project": {
                "name": "iCELL",
                "plate_id": "PLATE-42",
                "run_name": "PLATE-42",
                "seeding_date": "2026-04-14",
            },
            "mode": "dye",
            "plate_type": "96_well",
            "num_plates": 1,
            "seeding": {
                "final_well_volume_ul": 40.0,
                "stock_cell_concentration_cells_per_ml": 5_000_000,
                "overage_fraction": 0.3,
            },
            "dead_volume": {
                "cell_suspension_ul": 2000.0,
                "dye_ul": 500.0,
            },
        }

        seeded_layout_df = pd.DataFrame(
            [
                {
                    "plate_id": 1,
                    "well": "P1-A1",
                    "row": "A",
                    "column": 1,
                    "group": "Control",
                    "cells_per_well": 1000,
                    "dye_program": "Program_A",
                    "cell_suspension_dispense_ul_per_well": 20.0,
                    "required_cell_suspension_conc_cells_per_ml": 50_000.0,
                },
                {
                    "plate_id": 1,
                    "well": "P1-A2",
                    "row": "A",
                    "column": 2,
                    "group": "Treatment",
                    "cells_per_well": 1000,
                    "dye_program": pd.NA,
                    "cell_suspension_dispense_ul_per_well": 40.0,
                    "required_cell_suspension_conc_cells_per_ml": 25_000.0,
                },
            ]
        )

        dye_program_summary_df = pd.DataFrame(
            [
                {
                    "dye_program": "Program_A",
                    "n_wells": 1,
                    "mastermix_dispense_ul_per_well": 20.0,
                    "base_mastermix_volume_ul": 20.0,
                    "total_mastermix_volume_ul": 26.0,
                    "final_diluent_volume_ul": 24.974,
                }
            ]
        )

        dye_recipe_df = pd.DataFrame(
            [
                {
                    "dye_program": "Program_A",
                    "dye_name": "Hoechst 33342",
                    "stock_concentration": 1000.0,
                    "stock_concentration_unit": "X",
                    "final_concentration": 1.0,
                    "final_concentration_unit": "X",
                    "mastermix_target_concentration": 2.0,
                    "dye_stock_volume_ul": 0.052,
                    "needs_intermediate": True,
                    "intermediate_concentration": 52.0,
                    "effective_addition_volume_ul": 1.0,
                    "_canonical_unit": "X",
                },
                {
                    "dye_program": "Program_A",
                    "dye_name": "MitoTracker",
                    "stock_concentration": 1000.0,
                    "stock_concentration_unit": "X",
                    "final_concentration": 0.5,
                    "final_concentration_unit": "X",
                    "mastermix_target_concentration": 1.0,
                    "dye_stock_volume_ul": 0.026,
                    "needs_intermediate": False,
                    "intermediate_concentration": pd.NA,
                    "effective_addition_volume_ul": 0.026,
                    "_canonical_unit": "X",
                },
            ]
        )

        imeta_df = build_imeta_dataframe(
            config=config,
            seeded_layout_df=seeded_layout_df,
            dye_program_summary_df=dye_program_summary_df,
            dye_recipe_df=dye_recipe_df,
        )

        self.assertEqual(len(imeta_df), 2)
        self.assertEqual(
            list(imeta_df.columns),
            [
                "software",
                "software_version",
                "seeding_date",
                "plate_id",
                "well",
                "group",
                "seeding_density_cells_per_well",
                "initial_cell_suspension_concentration_cells/mL",
                "cell_suspension_concentration_cells/mL",
                "cell_suspension_dispense_ul_per_well",
                "dye_program",
                "dye_mastermix_dispense_ul_per_well",
                "Program_A_Hoechst 33342",
                "Program_A_MitoTracker",
                "Program_A_Diluent",
            ],
        )

        dyed_row = imeta_df.loc[imeta_df["well"] == "A01"].iloc[0]
        undyed_row = imeta_df.loc[imeta_df["well"] == "A02"].iloc[0]

        self.assertEqual(dyed_row["software"], "iCELL")
        self.assertEqual(dyed_row["software_version"], "1.0.0")
        self.assertEqual(dyed_row["plate_id"], "PLATE-42")
        self.assertEqual(dyed_row["seeding_date"], "2026-04-14")
        self.assertEqual(dyed_row["well"], "A01")
        self.assertEqual(dyed_row["group"], "Control")
        self.assertEqual(dyed_row["dye_program"], "Program_A")
        self.assertEqual(dyed_row["seeding_density_cells_per_well"], 1000)
        self.assertEqual(
            dyed_row["initial_cell_suspension_concentration_cells/mL"],
            "5000000",
        )
        self.assertEqual(dyed_row["cell_suspension_dispense_ul_per_well"], "20")
        self.assertEqual(dyed_row["cell_suspension_concentration_cells/mL"], "50000")
        self.assertEqual(dyed_row["dye_mastermix_dispense_ul_per_well"], "20")
        self.assertEqual(
            dyed_row["Program_A_Hoechst 33342"],
            "2 X in mastermix; 0.769231 uL/well",
        )
        self.assertEqual(
            dyed_row["Program_A_MitoTracker"],
            "1 X in mastermix; 0.02 uL/well",
        )
        self.assertEqual(
            dyed_row["Program_A_Diluent"],
            "Diluent in mastermix; 19.210769 uL/well",
        )
        total_dye_mastermix = (
            _extract_volume(dyed_row["Program_A_Hoechst 33342"])
            + _extract_volume(dyed_row["Program_A_MitoTracker"])
            + _extract_volume(dyed_row["Program_A_Diluent"])
        )
        self.assertAlmostEqual(total_dye_mastermix, 20.0, places=6)

        self.assertEqual(undyed_row["well"], "A02")
        self.assertEqual(undyed_row["group"], "Treatment")
        self.assertEqual(undyed_row["dye_program"], "NONE")
        self.assertEqual(undyed_row["dye_mastermix_dispense_ul_per_well"], "0")
        self.assertEqual(undyed_row["Program_A_Hoechst 33342"], "")
        self.assertEqual(undyed_row["Program_A_MitoTracker"], "")
        self.assertEqual(undyed_row["Program_A_Diluent"], "")

    def test_includes_plate_number_only_for_multi_plate_runs(self) -> None:
        config = {
            "project": {"plate_id": "PLATE-MULTI", "seeding_date": "2026-04-14"},
            "num_plates": 2,
        }
        seeded_layout_df = pd.DataFrame(
            [
                {
                    "plate_id": 2,
                    "well": "P2-B10",
                    "row": "B",
                    "column": 10,
                    "cells_per_well": 500,
                    "dye_program": pd.NA,
                    "cell_suspension_dispense_ul_per_well": 40.0,
                }
            ]
        )

        imeta_df = build_imeta_dataframe(config=config, seeded_layout_df=seeded_layout_df)

        self.assertEqual(
            list(imeta_df.columns),
            [
                "software",
                "software_version",
                "seeding_date",
                "plate_id",
                "plate_number",
                "well",
                "group",
                "seeding_density_cells_per_well",
                "initial_cell_suspension_concentration_cells/mL",
                "cell_suspension_concentration_cells/mL",
                "cell_suspension_dispense_ul_per_well",
                "dye_program",
                "dye_mastermix_dispense_ul_per_well",
            ],
        )
        self.assertEqual(imeta_df.iloc[0]["plate_id"], "PLATE-MULTI")
        self.assertEqual(imeta_df.iloc[0]["well"], "B10")
        self.assertEqual(imeta_df.iloc[0]["plate_number"], 2)
        self.assertEqual(imeta_df.iloc[0]["group"], "")


if __name__ == "__main__":
    unittest.main()
