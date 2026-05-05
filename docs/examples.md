# Worked examples

Two end-to-end runs you can reproduce locally to learn the workflow.

## Before you start

iCELL needs three CSV inputs plus a `config.json`. The user-facing flow is:

```
data/templates/*.csv  ─copy─►  data/input/*.csv  ─plus─►  config/config.json  ─run─►  data/output/
        │                            │                          │
   header-only                  your filled-in           your run-specific
   templates                       inputs                    settings
```

- Empty CSV templates: [`data/templates/`](../data/templates) (with [README](../data/templates/README.md))
- Empty config template: [`config/config.template.json`](../config/config.template.json) (with [schema](../config/config.schema.json))
- Worked examples: [`data/examples/`](../data/examples)

## Example 1 — Simple seeding (no dye)

Located in [`data/examples/simple_seeding/`](../data/examples/simple_seeding).

**Scenario:** Cells are seeded into selected wells of a 384-well plate. No dye program. Each well gets a single full-volume cell suspension dispense.

**To run:**
1. Copy the example into the working directories:
   ```bash
   cp data/examples/simple_seeding/config.json config/config.json
   # plus the CSVs that the example references — see its README
   ```
2. Start iCELL: `bash scripts/start.sh`.
3. Run via the notebook (`http://localhost:8888/lab?token=icell` → `notebooks/run.ipynb`) **or** drive the calculation through the web UI.

**Expected outputs** in `data/output/`:
- `tables/iCELL_<project>_<plate-id>_<timestamp>_seeding_summary.csv` — per-well cells/well, dispensed volume, and group assignment.
- `tables/iCELL_<project>_<plate-id>_<timestamp>_iMETA.csv` — the iMETA-format metadata export consumed by downstream iMETA.
- `instructions/iCELL_<project>_<plate-id>_<timestamp>_instructions.txt` — human-readable preparation steps.
- `logs/iCELL_<project>_<plate-id>_<timestamp>_run.log` — calculation trace.

## Example 2 — Seeding with a dye program

Located in [`data/examples/with_dye/`](../data/examples/with_dye).

**Scenario:** Same plate, but each well receives 20 µL of cell suspension plus 20 µL of dye mastermix. Two dye programs (`CP_A`, `CP_B`) defined in `meta_dye.csv` are assigned to subsets of wells via `dye_layout.csv`.

**To run:** Same procedure as Example 1, swap in the `with_dye` config and the CSVs from that example's directory.

**Additional outputs:**
- `tables/iCELL_<…>_dye_program_summary.csv` — per-dye-program total volume and mastermix recipe (one row per dye component, totaled across all wells using that program).

## Going from example → your real run

1. Read the example's `README.md` to see exactly which CSVs it uses and how the config maps to them.
2. Copy the matching templates from [`data/templates/`](../data/templates) into `data/input/` (keep the standard filenames: `cell_layout.csv`, `dye_layout.csv`, `meta_dye.csv`).
3. Fill the templates with your plate's actual data.
4. Copy [`config/config.template.json`](../config/config.template.json) to `config/config.json` and edit the `project.plate_id`, `mode`, `seeding`, and (if applicable) `dye` sections.
5. Run.

If the run fails, look first at `logs/`. If the failure is a config validation problem, validate `config/config.json` against [`config/config.schema.json`](../config/config.schema.json) — see [`config/README.md`](../config/README.md) for the validation command.