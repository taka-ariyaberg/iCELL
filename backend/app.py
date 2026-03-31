"""FastAPI application for iCELL App."""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from .api.routes import router

RESOURCE_ROOT = Path(
    os.environ.get("ICELL_RESOURCE_ROOT", Path(__file__).resolve().parent.parent)
).resolve()
FRONTEND_DIST = RESOURCE_ROOT / "frontend" / "dist"

app = FastAPI(
    title="iCELL App",
    description="Professional cell seeding and dye preparation calculator",
    version="1.0.0"
)

# Enable CORS to allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


if FRONTEND_DIST.exists():
    @app.get("/", include_in_schema=False)
    def serve_frontend_index():
        return FileResponse(FRONTEND_DIST / "index.html")


    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        """Root endpoint."""
        return {
            "message": "iCELL API is running",
            "docs": "/docs"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
