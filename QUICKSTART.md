# iCELL Quick Start

This guide covers both supported ways to run iCELL:

- The original notebook and file-based workflow
- The browser-based web app workflow

## Notebook Workflow

Use this when you want to run from files and keep the original iCELL process.

### 1. Create the Python environment

```bash
conda env create -f environment.yml
conda activate iCELL
```

### 2. Prepare inputs

Put your working files in [data/input](data/input):

- `cell_layout.csv` for cell counts per well
- `dye_layout.csv` for dye program assignments when using dye mode
- `meta_dye.csv` for dye recipe metadata when using dye mode

Reference examples are available in [data/examples](data/examples).

### 3. Edit config

Update [config/config.json](config/config.json) for your run.

Important fields:

```json
{
  "mode": "no_dye",
  "seeding": {
    "stock_cell_concentration_cells_per_ml": 5000000,
    "overage_fraction": 0.30
  }
}
```

### 4. Run the notebook

Open and run [notebooks/run.ipynb](notebooks/run.ipynb).

Generated outputs are written to [data/output](data/output).

## Web App Workflow

Use this when you want to design plate layouts interactively in the browser.

Replace `/path/to/iCELL_V2` below with the actual location of your local repo.

### 1. Start the backend

```bash
cd /path/to/iCELL_V2
conda activate iCELL
./scripts/start_backend.sh
```

### 2. Start the frontend

```bash
cd /path/to/iCELL_V2/frontend
npm install
../scripts/start_frontend.sh
```

Open the Vite URL shown in the terminal. Depending on your local config, this may be `http://localhost:3000` or `http://localhost:5173`.

To stop either server, return to its terminal and press `Ctrl+C`.

## Modes

### `no_dye`

- Full cell suspension volume goes into each seeded well
- No dye mastermix is calculated

### `dye`

- Dyed wells use split cell suspension plus dye mastermix volume
- Undyed wells can still use full cell suspension volume within the same run
- Cell suspension calculations adapt to each well's actual dispense volume

## Outputs

iCELL writes run artifacts under [data/output](data/output):

- `tables/` for CSV outputs
- `instructions/` for step-by-step instructions
- `logs/` for calculation traces

## Troubleshooting

- Missing input file: check filenames in [config/config.json](config/config.json) and [data/input](data/input)
- Wrong concentrations: verify stock concentration and mode settings
- Web app cannot connect: confirm the backend is running on port 8000

## More Detail

- [README.md](README.md)
- [APP_SETUP.md](APP_SETUP.md)
- [config/schema.json](config/schema.json)