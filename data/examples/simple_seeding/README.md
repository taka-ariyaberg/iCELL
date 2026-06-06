# Simple Cell Seeding Example

This example demonstrates iCELL with **cell seeding only** (no dye).

## Usage

Start the web app with `bash scripts/start.sh` and open http://localhost:8080.

Recreate this scenario in the Plate Designer UI: choose which wells get seeded and
with how many cells, then adjust the seeding parameters as needed (e.g. stock cell
concentration to match your suspension, overage fraction, plate ID, seeding date) and
run the calculation.

## Expected Output

The app will generate:
- **Seeding summary table** - how much cell suspension to prepare per cell concentration group
- **Seeding instructions** - step-by-step mixing instructions
- **iMETA.csv** - per-well metadata export for downstream use
- **Run log** - detailed trace of the calculation

Artifacts use the shared naming format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, where `<base>` is built from `project.name` + `project.plate_id`. Example:

- `iCELL_MyProject_Plate1_seeding_summary_2026-05-06-10-30-45.csv`
