from __future__ import annotations

import sys
import unittest
from datetime import datetime
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from icell.reporting.formatted_exports import (
    build_export_file_base,
    build_formatted_dye_summary_dataframe,
    build_formatted_seeding_summary_dataframe,
)


class FormattedExportTests(unittest.TestCase):
    def test_build_export_file_base_uses_project_plate_and_date(self) -> None:
        config = {
            "project": {
                "name": "My Project",
                "plate_id": "Plate 01/A",
            }
        }

        base = build_export_file_base(config, exported_at=datetime(2026, 4, 14))

        self.assertEqual(base, "My_Project__Plate_01_A__2026-04-14")

    def test_build_formatted_seeding_summary_dataframe(self) -> None:
        config = {
            "project": {
                "name": "My Project",
                "plate_id": "Plate-01",
                "seeding_date": "2026-04-14",
            }
        }
        seeding_summary_df = pd.DataFrame(
            [
                {
                    "cells_per_well": 1000,
                    "cell_suspension_dispense_ul_per_well": 20.0,
                    "n_wells": 2,
                    "wells": "A01, A02",
                    "base_cell_suspension_volume_ul": 40.0,
                    "total_cell_suspension_volume_ul": 52.0,
                    "required_cell_suspension_conc_cells_per_ml": 50000.0,
                }
            ]
        )

        formatted_df = build_formatted_seeding_summary_dataframe(config, seeding_summary_df)

        self.assertEqual(
            list(formatted_df.columns),
            [
                "software",
                "software_version",
                "project_name",
                "plate_id",
                "seeding_date",
                "seeding_density_cells_per_well",
                "cell_suspension_dispense_ul_per_well",
                "cell_suspension_concentration",
                "seeded_well_count",
                "assigned_wells",
                "base_cell_suspension_volume_ul",
                "total_cell_suspension_volume_ul",
            ],
        )
        row = formatted_df.iloc[0]
        self.assertEqual(row["project_name"], "My Project")
        self.assertEqual(row["plate_id"], "Plate-01")
        self.assertEqual(row["cell_suspension_concentration"], "50000 cells/mL")
        self.assertEqual(row["assigned_wells"], "A01, A02")
        self.assertEqual(row["total_cell_suspension_volume_ul"], "52")

    def test_build_formatted_dye_summary_dataframe(self) -> None:
        config = {
            "project": {
                "name": "My Project",
                "plate_id": "Plate-01",
                "seeding_date": "2026-04-14",
            }
        }
        dye_summary_df = pd.DataFrame(
            [
                {
                    "dye_program": "CP_FULL",
                    "n_wells": 2,
                    "wells": "A01, A02",
                    "mastermix_dispense_ul_per_well": 20.0,
                    "base_mastermix_volume_ul": 40.0,
                    "total_mastermix_volume_ul": 52.0,
                    "final_diluent_volume_ul": 50.48,
                }
            ]
        )
        dye_recipe_df = pd.DataFrame(
            [
                {
                    "dye_program": "CP_FULL",
                    "dye_name": "Hoechst 33342",
                    "mastermix_target_concentration": 2.0,
                    "final_concentration_unit": "X",
                    "effective_addition_volume_ul": 1.0,
                    "total_mastermix_volume_ul": 52.0,
                },
                {
                    "dye_program": "CP_FULL",
                    "dye_name": "MitoTracker",
                    "mastermix_target_concentration": 1.0,
                    "final_concentration_unit": "X",
                    "effective_addition_volume_ul": 0.52,
                    "total_mastermix_volume_ul": 52.0,
                },
            ]
        )

        formatted_df = build_formatted_dye_summary_dataframe(
            config=config,
            dye_program_summary_df=dye_summary_df,
            dye_recipe_df=dye_recipe_df,
        )

        self.assertEqual(
            list(formatted_df.columns),
            [
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
                "CP_FULL_Hoechst 33342",
                "CP_FULL_MitoTracker",
                "CP_FULL_Diluent",
            ],
        )
        row = formatted_df.iloc[0]
        self.assertEqual(row["dye_program"], "CP_FULL")
        self.assertEqual(row["CP_FULL_Hoechst 33342"], "2 X in mastermix; 1 uL total")
        self.assertEqual(row["CP_FULL_MitoTracker"], "1 X in mastermix; 0.52 uL total")
        self.assertEqual(row["CP_FULL_Diluent"], "Diluent in mastermix; 50.48 uL total")


if __name__ == "__main__":
    unittest.main()
