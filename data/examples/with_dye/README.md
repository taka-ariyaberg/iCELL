# Cell Seeding with Dye Example

This example demonstrates iCELL with **cell seeding + dye staining**.

## Setup

1. Copy the CSV files from this directory to `data/input/`:
   - `cell_layout.csv` - defines which wells get seeded and with how many cells
   - `dye_layout.csv` - defines which wells get which dye program
   - `meta_dye.csv` - defines the dye recipes and concentrations

2. Copy `config.json` from this directory to the project root `config/` directory

3. Update the config if needed:
   - Change `stock_cell_concentration_cells_per_ml` to match your cell suspension
   - Adjust `overage_fraction` if needed (default 30%)
   - Set `project.plate_id` to the identifier you want to see in exports
   - Optionally set `project.seeding_date`
   - Update dye `meta_dye_csv` path if necessary

4. Run the notebook!

## Key Differences from Simple Seeding

- Cell suspension volume per well is reduced to **20 µL** (instead of 40 µL)
- Dye mastermix is **20 µL** per well
- Required cell suspension concentration **doubles** to compensate for reduced volume
- Dye preparation instructions are included in the output
- `meta_dye.csv` stays as the dye recipe input file, while `iMETA.csv` is generated as the per-well metadata export
- Mastermix instructions describe `Diluent` first, then add each dye component into the diluent

## Expected Output

The notebook will generate:
- **Seeding summary table** - cell suspension volumes per concentration group
- **Dye mastermix summary table** - dye volumes per dye program
- **Cell and dye preparation instructions** - complete mixing steps
- **iMETA.csv** - per-well metadata export with Plate ID, well/group info, stock and per-well cell suspension concentrations, and dye-component additions
- **Run log** - detailed trace of the calculation

Artifacts use the shared naming format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, where `<base>` is built from `project.name` + `project.plate_id`. Example:

- `iCELL_MyProject_Plate1_dye_program_summary_2026-05-06-10-30-45.csv`
