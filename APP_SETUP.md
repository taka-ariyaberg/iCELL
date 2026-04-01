# iCELL Web App Setup

This guide covers local development for the React frontend and FastAPI backend.

The web app is an additional interface on top of the existing iCELL engine in [src/icell](src/icell). It does not replace the notebook/config workflow.

## Prerequisites

- Node.js 18+
- Python 3.11+
- A working Python environment for the backend, either from [environment.yml](environment.yml) or a local virtual environment

## Backend

Install backend dependencies and start the API:

Replace `/path/to/iCELL_V2` below with the actual location of your local repo.

Conda:

```bash
cd /path/to/iCELL_V2
conda activate iCELL
pip install -r backend/requirements.txt
./scripts/start_backend.sh
```

Virtual environment:

```bash
cd /path/to/iCELL_V2
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
./scripts/start_backend.sh
```

Useful URLs:

- API docs: `http://localhost:8000/docs`
- Health endpoint: `http://localhost:8000/api/health`

## Frontend

Install frontend dependencies and start Vite:

```bash
cd /path/to/iCELL_V2/frontend
npm install
../scripts/start_frontend.sh
```

Open the local URL printed by Vite. Depending on your local config, this may be `http://localhost:3000` or `http://localhost:5173`.

## Environment Configuration

The frontend supports either of these variables:

- `VITE_API_URL`
- `VITE_API_BASE_URL`

Example local config:

```bash
cd frontend
cp .env.example .env.local
```

Default API fallback is `http://localhost:8000/api`.

## Common Development Flow

Run the backend and frontend in separate terminals.

Terminal 1:

```bash
cd /path/to/iCELL_V2
source .venv/bin/activate  # or: conda activate iCELL
./scripts/start_backend.sh
```

Terminal 2:

```bash
cd /path/to/iCELL_V2/frontend
../scripts/start_frontend.sh
```

To stop either server, return to its terminal and press `Ctrl+C`.

## API Surface

Base API path: `http://localhost:8000/api`

- `GET /health` for health checks
- `POST /run` for browser-designed runs
- `POST /upload-csv` for config and CSV upload processing

## Troubleshooting

### Backend unavailable

Confirm the API is running:

```bash
curl http://localhost:8000/api/health
```

### Port conflict

```bash
lsof -ti:8000
lsof -ti:3000
lsof -ti:5173
```

### Frontend points at the wrong API

Check your `frontend/.env.local` values and restart Vite.

## Related Documentation

- [README.md](README.md)
- [QUICKSTART.md](QUICKSTART.md)
- [frontend/README.md](frontend/README.md)
