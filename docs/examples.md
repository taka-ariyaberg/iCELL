# Worked examples

iCELL runs as a web app — you design a plate in the browser and click **Process** to
get the seeding summary, dye program summary, instructions, and the iMETA metadata
export.

To try it end to end, start the app and follow the workflow in the
[README](../README.md#workflow):

```bash
bash scripts/start.sh
```

Then open `http://localhost:8080` and design a plate.

## Reference scenarios

Two reference scenarios live under [`data/examples/`](../data/examples):

- [`simple_seeding/`](../data/examples/simple_seeding) — cells seeded into selected
  wells of a 384-well plate, no dye program. Each well gets a single full-volume cell
  suspension dispense.
- [`with_dye/`](../data/examples/with_dye) — same plate, but each well also receives a
  dye mastermix. Two dye programs (`CP_A`, `CP_B`) are assigned to subsets of wells.

Each scenario's `README.md` describes the parameters; reproduce them in the web app to
see the corresponding outputs in `data/output/`.
