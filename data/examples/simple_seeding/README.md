# Simple Cell Seeding Example

This example demonstrates iCELL with **cell seeding only** (no dye).

## Usage

Start the web app with `bash scripts/start.sh` and open http://localhost:8080.

You can use this example in either of two ways:

- **Load the CSV** — upload `cell_layout.csv` from this directory via the web app's CSV upload, which recreates the well layout for you.
- **Recreate it by hand** — build the same layout in the Plate Designer UI, choosing which wells get seeded and with how many cells.

Then adjust the seeding parameters in the UI as needed (e.g. stock cell concentration to match your suspension, overage fraction, plate ID, seeding date) and run the calculation.

## Expected Output

The app will generate:
- **Seeding summary table** - how much cell suspension to prepare per cell concentration group
- **Seeding instructions** - step-by-step mixing instructions
- **iMETA.csv** - per-well metadata export for downstream use
- **Run log** - detailed trace of the calculation

Artifacts use the shared naming format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, where `<base>` is built from `project.name` + `project.plate_id`. Example:

- `iCELL_MyProject_Plate1_seeding_summary_2026-05-06-10-30-45.csv`
