"""Application entrypoint for the AI orchestrator service."""

from __future__ import annotations

import logging
import os

from src.app import create_app

try:
    import coloredlogs
    coloredlogs.install(
        level=logging.INFO,
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

app = create_app()


def main() -> None:
    """Uvicorn entrypoint for local development."""

    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8989")),
        reload=os.getenv("UVICORN_RELOAD", "1") == "1",
        log_config=None,  # Use basicConfig format for consistency
    )


if __name__ == "__main__":
    main()
