# Simple Cell Seeding Example

This example demonstrates iCELL with **cell seeding only** (no dye).

## Setup

1. Copy the CSV files from this directory to `data/input/`:
   - `cell_layout.csv` - defines which wells get seeded and with how many cells

2. Copy `config.json` from this directory to the project root `config/` directory

3. Update the config if needed:
   - Change `stock_cell_concentration_cells_per_ml` to match your cell suspension
   - Adjust `overage_fraction` if needed (default 30%)
   - Set `project.plate_id` to the identifier you want to see in exports
   - Optionally set `project.seeding_date`

4. Run the notebook!

## Expected Output

The notebook will generate:
- **Seeding summary table** - how much cell suspension to prepare per cell concentration group
- **Seeding instructions** - step-by-step mixing instructions
- **iMETA.csv** - per-well metadata export for downstream use
- **Run log** - detailed trace of the calculation

Artifacts use the shared naming format:

- `ProjectName__PlateID__YYYY-MM-DD__artifact`
