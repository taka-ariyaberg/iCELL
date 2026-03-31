from __future__ import annotations

import pandas as pd


def _load_plate_matrix_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    if df.shape[1] < 2:
        raise ValueError(
            "Plate layout CSV must have at least 2 columns: 'row_name' and one plate column."
        )

    first_col = str(df.columns[0]).strip()
    if first_col != "row_name":
        raise KeyError(
            f"First column must be 'row_name'. Found: '{df.columns[0]}'"
        )

    df = df.copy()
    df.rename(columns={df.columns[0]: "row_name"}, inplace=True)
    df["row_name"] = df["row_name"].astype(str).str.strip().str.upper()

    if df["row_name"].eq("").any():
        raise ValueError("row_name cannot be blank.")

    if df["row_name"].duplicated().any():
        dupes = df.loc[df["row_name"].duplicated(keep=False), ["row_name"]]
        raise ValueError(f"Duplicate row_name values found:\n{dupes}")

    plate_cols = list(df.columns[1:])
    normalized_cols = []

    for col in plate_cols:
        col_str = str(col).strip()
        try:
            col_int = int(float(col_str))
        except Exception as e:
            raise ValueError(
                f"Plate column '{col}' is invalid. Plate columns must be numeric like 1, 2, 3, ..."
            ) from e
        normalized_cols.append(col_int)

    if len(normalized_cols) != len(set(normalized_cols)):
        raise ValueError(f"Duplicate plate columns found: {normalized_cols}")

    rename_map = {old: new for old, new in zip(plate_cols, normalized_cols)}
    df.rename(columns=rename_map, inplace=True)

    return df


def load_cell_layout_csv(path: str) -> pd.DataFrame:
    wide_df = _load_plate_matrix_csv(path)

    long_df = wide_df.melt(
        id_vars="row_name",
        var_name="column",
        value_name="cells_per_well",
    )

    long_df["column"] = pd.to_numeric(long_df["column"], errors="raise").astype(int)

    non_empty = long_df["cells_per_well"].notna() & (
        long_df["cells_per_well"].astype(str).str.strip() != ""
    )
    df = long_df.loc[non_empty].copy()

    if df.empty:
        raise ValueError("cell_layout.csv contains no seeded wells.")

    df["cells_per_well"] = pd.to_numeric(df["cells_per_well"], errors="raise")

    invalid_cells = df["cells_per_well"] <= 0
    if invalid_cells.any():
        bad_rows = df.loc[invalid_cells, ["row_name", "column", "cells_per_well"]]
        raise ValueError(
            f"Seeded wells must have cells_per_well > 0. Bad rows:\n{bad_rows}"
        )

    df["row"] = df["row_name"]
    df["seed"] = 1
    df["well"] = df["row"] + df["column"].astype(str)

    if df["well"].duplicated().any():
        dupes = df.loc[df["well"].duplicated(keep=False), ["row", "column", "well"]]
        raise ValueError(f"Duplicate wells found in cell_layout.csv:\n{dupes}")

    return (
        df[["row", "column", "seed", "cells_per_well", "well"]]
        .sort_values(["row", "column"])
        .reset_index(drop=True)
    )


def load_dye_layout_csv(path: str) -> pd.DataFrame:
    wide_df = _load_plate_matrix_csv(path)

    long_df = wide_df.melt(
        id_vars="row_name",
        var_name="column",
        value_name="dye_program",
    )

    long_df["column"] = pd.to_numeric(long_df["column"], errors="raise").astype(int)

    non_empty = long_df["dye_program"].notna() & (
        long_df["dye_program"].astype(str).str.strip() != ""
    )
    df = long_df.loc[non_empty].copy()

    if df.empty:
        return pd.DataFrame(columns=["row", "column", "dye_program", "well"])

    df["dye_program"] = df["dye_program"].astype(str).str.strip()
    df["row"] = df["row_name"]
    df["well"] = df["row"] + df["column"].astype(str)

    if df["well"].duplicated().any():
        dupes = df.loc[df["well"].duplicated(keep=False), ["row", "column", "well"]]
        raise ValueError(f"Duplicate wells found in dye_layout.csv:\n{dupes}")

    return (
        df[["row", "column", "dye_program", "well"]]
        .sort_values(["row", "column"])
        .reset_index(drop=True)
    )


def get_seeded_wells(df: pd.DataFrame) -> pd.DataFrame:
    return df.loc[df["seed"] == 1].copy()


def merge_cell_and_dye_layout(
    cell_df: pd.DataFrame,
    dye_df: pd.DataFrame | None,
    num_plates: int = 1,
) -> pd.DataFrame:
    merged = cell_df.copy()

    if dye_df is None:
        merged["dye_program"] = pd.NA
    else:
        merged = merged.merge(
            dye_df[["well", "dye_program"]],
            on="well",
            how="left",
            validate="one_to_one",
        )

    # Multiply by number of plates
    if num_plates > 1:
        plate_dfs = []
        for plate_id in range(1, num_plates + 1):
            plate_df = merged.copy()
            plate_df["plate_id"] = plate_id
            # Update well names to include plate ID
            plate_df["well"] = "P" + str(plate_id) + "-" + plate_df["well"].astype(str)
            plate_dfs.append(plate_df)
        merged = pd.concat(plate_dfs, ignore_index=True)
    else:
        merged["plate_id"] = 1

    return merged.sort_values(["plate_id", "row", "column"]).reset_index(drop=True)