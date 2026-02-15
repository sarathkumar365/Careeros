"""FastAPI application factory and routes."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request

from .orchestrator import OrchestratorService, Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Factory for the FastAPI application."""

    service = OrchestratorService(settings=settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await service.startup()
        app.state.service = service
        try:
            yield
        finally:
            await service.shutdown()

    app = FastAPI(
        title="AI Worker Orchestrator",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/health")
    async def health(request: Request) -> dict[str, Any]:  # noqa: F811
        orchestrator: OrchestratorService = request.app.state.service
        rabbit_status = await orchestrator.health()
        return {
            "status": "ok" if rabbit_status.get("connected") else "unavailable",
            "rabbitmq": rabbit_status,
            "service": {"version": app.version},
        }

    return app


__all__ = ["create_app"]
