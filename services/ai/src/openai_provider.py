"""OpenAI provider implementation."""

from __future__ import annotations

import logging
import os

from openai import OpenAI

LOGGER = logging.getLogger("ai.providers.openai")


class OpenAIProvider:
    """OpenAI LLM provider supporting GPT-4o"""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        reasoning_model: str | None = None,
    ) -> None:
        """Initialize OpenAI provider.

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Default model for standard tasks (defaults to gpt-4o)
            reasoning_model: Model for reasoning tasks (defaults to gpt-5)
        """
        self.client = OpenAI(api_key=api_key, max_retries=0)
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o")
        self.reasoning_model = reasoning_model or os.getenv("OPENAI_REASONING_MODEL", "gpt-5")

    def get_model_name(self, reasoning: bool = False) -> str:
        """Get the current model name."""
        return self.reasoning_model if reasoning else self.model


__all__ = ["OpenAIProvider"]
