from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from typing import Any

from fastapi import FastAPI

from backend.app import register_frontend


def _endpoint(app: FastAPI, path: str) -> Any:
    return next(route.endpoint for route in app.routes if getattr(route, "path", None) == path)


class FrontendServingTests(unittest.TestCase):
    """Guards how the built frontend is served: index.html must be revalidated
    on every load (otherwise a rebuild stays invisible behind the browser
    cache), hashed assets stay cacheable, and no request path may read a file
    outside the dist folder."""

    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.dist = root / "frontend" / "dist"
        (self.dist / "assets").mkdir(parents=True)
        (self.dist / "index.html").write_text("<!doctype html>")
        (self.dist / "assets" / "index-abc123.js").write_text("console.log(1)")
        (root / "secret.txt").write_text("outside dist")

        app = FastAPI()
        register_frontend(app, self.dist)
        self.serve_index = _endpoint(app, "/")
        self.serve_path = _endpoint(app, "/{full_path:path}")

    def assertServes(self, response: Any, relative: str) -> None:
        self.assertEqual(Path(response.path).resolve(), (self.dist / relative).resolve())

    def test_index_html_is_revalidated_on_every_load(self) -> None:
        for response in (
            self.serve_index(),
            self.serve_path("design"),  # client-side route fallback
            self.serve_path("index.html"),  # direct request
        ):
            self.assertServes(response, "index.html")
            self.assertEqual(response.headers.get("cache-control"), "no-cache")

    def test_hashed_assets_keep_default_caching(self) -> None:
        response = self.serve_path("assets/index-abc123.js")
        self.assertServes(response, "assets/index-abc123.js")
        self.assertIsNone(response.headers.get("cache-control"))

    def test_unsafe_or_invalid_paths_fall_back_to_index(self) -> None:
        for path in (
            "../../secret.txt",
            str(self.dist.parent.parent / "secret.txt"),  # absolute, from //...
            "bad\x00name",  # embedded null byte (GET /%00)
            "a" * 300,  # longer than the OS name limit (ENAMETOOLONG)
        ):
            self.assertServes(self.serve_path(path), "index.html")


if __name__ == "__main__":
    unittest.main()
