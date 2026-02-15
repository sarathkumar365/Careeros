"""Utility for managing a shared RabbitMQ connection."""

from __future__ import annotations

import asyncio
from time import perf_counter
from typing import cast

from aio_pika import connect_robust
from aio_pika.abc import (
    AbstractRobustChannel,
    AbstractRobustConnection,
)


class RabbitManager:
    """Handles connecting to RabbitMQ and exposing a shared channel."""

    def __init__(self, url: str, prefetch_count: int = 5) -> None:
        self._url = url
        self._prefetch_count = max(prefetch_count, 0)
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractRobustChannel | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> AbstractRobustChannel:
        """Initialise the RabbitMQ connection/channel if needed and return the channel."""

        async with self._lock:
            if self._connection is None or self._connection.is_closed:
                raw_connection = await connect_robust(self._url)
                self._connection = cast(AbstractRobustConnection, raw_connection)

            if self._connection is None:
                raise RuntimeError("Failed to initialise RabbitMQ connection")

            if self._channel is None or self._channel.is_closed:
                raw_channel = await self._connection.channel()
                channel = cast(AbstractRobustChannel, raw_channel)
                if self._prefetch_count:
                    await channel.set_qos(prefetch_count=self._prefetch_count)
                self._channel = channel

            if self._channel is None:
                raise RuntimeError("Failed to initialise RabbitMQ channel")

            return self._channel

    def channel(self) -> AbstractRobustChannel:
        """Return the connected channel or raise if unavailable."""

        if self._channel is None or self._channel.is_closed:
            raise RuntimeError("RabbitMQ channel has not been initialised yet")
        return self._channel

    async def close(self) -> None:
        """Close the channel and connection if they exist."""

        async with self._lock:
            if self._channel is not None and not self._channel.is_closed:
                await self._channel.close()
            self._channel = None

            if self._connection is not None and not self._connection.is_closed:
                await self._connection.close()
            self._connection = None

    async def ping(self) -> float:
        """Ensure the channel is available and return the latency in milliseconds."""

        start = perf_counter()
        channel = await self.connect()
        if channel.is_closed:
            raise RuntimeError("RabbitMQ channel is closed")
        return (perf_counter() - start) * 1000.0

    @property
    def is_connected(self) -> bool:
        """Return True when an open channel is available."""

        return self._channel is not None and not self._channel.is_closed


__all__ = ["RabbitManager"]

