# Cell Seeding with Dye Example

This example demonstrates iCELL with **cell seeding + dye staining**.

## Usage

Start the web app with `bash scripts/start.sh` and open http://localhost:8080.

You can use this example in either of two ways:

- **Load the CSVs** — upload the CSV files from this directory via the web app's CSV upload:
   - `cell_layout.csv` - defines which wells get seeded and with how many cells
   - `dye_layout.csv` - defines which wells get which dye program
   - `meta_dye.csv` - defines the dye recipes and concentrations
- **Recreate it by hand** — build the same cell and dye layout in the Plate Designer UI.

Then adjust the seeding parameters in the UI as needed (e.g. stock cell concentration to match your suspension, overage fraction, plate ID, seeding date) and run the calculation.

## Key Differences from Simple Seeding

- Cell suspension volume per well is reduced to **20 µL** (instead of 40 µL)
- Dye mastermix is **20 µL** per well
- Required cell suspension concentration **doubles** to compensate for reduced volume
- Dye preparation instructions are included in the output
- `meta_dye.csv` stays as the dye recipe input file, while `iMETA.csv` is generated as the per-well metadata export
- Mastermix instructions describe `Diluent` first, then add each dye component into the diluent

## Expected Output

The app will generate:
- **Seeding summary table** - cell suspension volumes per concentration group
- **Dye mastermix summary table** - dye volumes per dye program
- **Cell and dye preparation instructions** - complete mixing steps
- **iMETA.csv** - per-well metadata export with Plate ID, well/group info, stock and per-well cell suspension concentrations, and dye-component additions
- **Run log** - detailed trace of the calculation

Artifacts use the shared naming format `iCELL_<base>_<artifact>_<timestamp>.<ext>`, where `<base>` is built from `project.name` + `project.plate_id`. Example:

- `iCELL_MyProject_Plate1_dye_program_summary_2026-05-06-10-30-45.csv`
