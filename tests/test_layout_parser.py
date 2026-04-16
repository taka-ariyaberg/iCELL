from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from icell.processing.layout_parser import apply_well_groups


class LayoutParserGroupMappingTests(unittest.TestCase):
    def test_apply_well_groups_matches_single_and_multi_plate_wells(self) -> None:
        merged_df = pd.DataFrame(
            [
                {"plate_id": 1, "well": "P1-A1", "row": "A", "column": 1, "cells_per_well": 500},
                {"plate_id": 2, "well": "P2-A1", "row": "A", "column": 1, "cells_per_well": 500},
                {"plate_id": 2, "well": "P2-B2", "row": "B", "column": 2, "cells_per_well": 1000},
            ]
        )

        grouped_df = apply_well_groups(
            merged_df,
            {
                "A1": "Control",
                "P2-B2": "Treatment",
            },
        )

        self.assertEqual(grouped_df.loc[0, "group"], "Control")
        self.assertEqual(grouped_df.loc[1, "group"], "Control")
        self.assertEqual(grouped_df.loc[2, "group"], "Treatment")


if __name__ == "__main__":
    unittest.main()
