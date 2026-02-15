"""Orchestrator service responsible for managing RabbitMQ-backed job queues."""

import asyncio
import json
import logging
import os
from datetime import UTC, datetime
from typing import Any

from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import (
    AbstractIncomingMessage,
    AbstractRobustExchange,
    AbstractRobustQueue,
)
from pydantic import BaseModel, Field, ValidationError

from src.types.checklist import Checklist
from src.types.message_types import (
    CHECKLIST_MATCHING,
    CHECKLIST_PARSING,
    RESUME_PARSING,
    RESUME_TAILORING,
    ChecklistMatching,
    ChecklistMatchingCompleted,
    ChecklistMatchingFailed,
    ChecklistParsing,
    ChecklistParsingCompleted,
    ChecklistParsingFailed,
    EventBase,
    JobSubmissionBase,
    ResumeParsing,
    ResumeParsingCompleted,
    ResumeParsingFailed,
    ResumeTailoring,
    ResumeTailoringCompleted,
    ResumeTailoringFailed,
)

from .infrastructure.rabbit_manager import RabbitManager
from .services import checklist_matching, checklist_parsing, resume_parsing, resume_tailoring

LOGGER = logging.getLogger("ai.orchestrator")


class Settings(BaseModel):
    """Runtime configuration for the orchestrator service."""

    rabbitmq_url: str = Field(
        default_factory=lambda: os.getenv("RABBITMQ_URL", "amqp://default:default@localhost:5672")
    )
    job_submission_exchange: str = Field(
        default_factory=lambda: os.getenv("JOB_SUBMISSION_EXCHANGE", "jobs.submission")
    )
    job_submission_queue: str = Field(
        default_factory=lambda: os.getenv("JOB_SUBMISSION_QUEUE", "jobs.submission.worker")
    )
    job_submission_routing_key: str = Field(
        default_factory=lambda: os.getenv("JOB_SUBMISSION_ROUTING_KEY", "job.submitted")
    )
    job_events_exchange: str = Field(
        default_factory=lambda: os.getenv("JOB_EVENTS_EXCHANGE", "jobs.events")
    )
    rabbitmq_prefetch: int = Field(default_factory=lambda: int(os.getenv("RABBITMQ_PREFETCH", "5")))


class OrchestratorService:
    """
    Connects to RabbitMQ, consumes job submissions, and emits progress events.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.rabbit_manager = RabbitManager(
            self.settings.rabbitmq_url, prefetch_count=self.settings.rabbitmq_prefetch
        )

        # Initialize LLM provider singleton

        self._submission_exchange: AbstractRobustExchange | None = None
        self._submission_queue: AbstractRobustQueue | None = None
        self._events_exchange: AbstractRobustExchange | None = None

        self._consumer_tag: str | None = None
        self._stopping = asyncio.Event()

    async def startup(self) -> None:
        """Connect to RabbitMQ, declare topology, and start the consumer loop."""

        channel = await self.rabbit_manager.connect()
        LOGGER.info("Connected to RabbitMQ at %s", self.settings.rabbitmq_url)

        self._submission_exchange = await channel.declare_exchange(
            self.settings.job_submission_exchange,
            ExchangeType.TOPIC,
            durable=True,
        )
        self._submission_queue = await channel.declare_queue(
            self.settings.job_submission_queue,
            durable=True,
        )
        await self._submission_queue.bind(
            self._submission_exchange,
            routing_key=self.settings.job_submission_routing_key,
        )

        self._events_exchange = await channel.declare_exchange(
            self.settings.job_events_exchange,
            ExchangeType.TOPIC,
            durable=True,
        )

        await self._start_consumer()

    async def shutdown(self) -> None:
        """Stop the consumer loop and close RabbitMQ connections."""

        await self._stop_consumer()
        await self.rabbit_manager.close()
        LOGGER.info("Orchestrator shutdown complete")

    async def health(self) -> dict[str, Any]:
        """Return RabbitMQ connectivity details for the health endpoint."""

        try:
            latency_ms = await self.rabbit_manager.ping()
            return {
                "connected": self.rabbit_manager.is_connected,
                "latency_ms": latency_ms,
                "error": None,
            }
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.warning("RabbitMQ health check failed: %s", exc)
            return {"connected": False, "error": str(exc)}

    async def _start_consumer(self) -> None:
        if self._submission_queue is None:
            LOGGER.error("Submission queue not initialised; cannot consume jobs")
            return

        if self._consumer_tag is not None:
            return

        self._stopping.clear()

        try:
            self._consumer_tag = await self._submission_queue.consume(
                self._consume_msg,
                no_ack=False,
            )
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.error("Failed to start job consumer: %s", exc)
            self._consumer_tag = None
            raise RuntimeError("Failed to start job consumer") from exc

    async def _stop_consumer(self) -> None:
        LOGGER.warning("queue consume stopped")
        self._stopping.set()
        if self._submission_queue is None or self._consumer_tag is None:
            return

        tag = self._consumer_tag
        self._consumer_tag = None

        try:
            await self._submission_queue.cancel(tag)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.warning("Error cancelling consumer %s: %s", tag, exc)

    async def _consume_msg(self, message: AbstractIncomingMessage) -> None:
        if self._stopping.is_set():
            await message.nack(requeue=True)
            return

        async with message.process(requeue=False):
            payload = self._parse_submission(message.body)
            if payload is None:
                # TODO: better error handling when body cannot be parsed
                return

            await self._handle_job(payload)

    def _parse_submission(self, body: bytes) -> dict[str, Any] | None:
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            LOGGER.warning("Discarding job with invalid JSON payload: %s", exc)
            return None

        return payload

    async def _handle_job(self, payload: dict[str, Any]) -> None:
        try:
            base = JobSubmissionBase.model_validate(payload)
            LOGGER.info(f"Received {base.message_type}")
        except ValidationError as exc:
            LOGGER.warning("Discarding job with invalid base schema: %s", exc)
            return

        if base.message_type == RESUME_PARSING:
            submission = ResumeParsing.model_validate(payload)
            await self._handle_resume_parsing(submission)
        elif base.message_type == RESUME_TAILORING:
            submission = ResumeTailoring.model_validate(payload)
            await self._handle_resume_tailoring(submission)
        elif base.message_type == CHECKLIST_PARSING:
            submission = ChecklistParsing.model_validate(payload)
            await self._handle_checklist_parsing(submission)
        elif base.message_type == CHECKLIST_MATCHING:
            submission = ChecklistMatching.model_validate(payload)
            await self._handle_checklist_matching(submission)
        else:
            raise ValueError(f"Unknown message type: {base.message_type}")

    async def _handle_resume_tailoring(self, submission: ResumeTailoring) -> None:
        try:
            tailored_resume = await asyncio.to_thread(
                resume_tailoring,
                submission.checklist,
                submission.resume_structure,
                submission.json_schema,
            )
            event = ResumeTailoringCompleted(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                resume_structure=tailored_resume,
            )
            await self._publish_event(event)
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.error("Job %s (resume.tailoring) failed: %s", submission.job_id, exc)
            event = ResumeTailoringFailed(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                error=str(exc),
            )
            await self._publish_event(event)

    async def _handle_resume_parsing(self, submission: ResumeParsing) -> None:
        try:
            structure = await asyncio.to_thread(
                resume_parsing,
                submission.raw_resume_content,
                submission.json_schema,
            )
            event = ResumeParsingCompleted(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                resume_structure=structure,
            )
            await self._publish_event(event)
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.error("Job %s (resume.parsing) failed: %s", submission.job_id, exc)
            event = ResumeParsingFailed(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                error=str(exc),
            )
            await self._publish_event(event)

    async def _handle_checklist_parsing(self, submission: ChecklistParsing) -> None:
        """Handle job description to checklist conversion."""
        try:
            checklist: Checklist = await asyncio.to_thread(
                checklist_parsing,
                submission.job_description,
            )
            event = ChecklistParsingCompleted(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                checklist=checklist,
            )
            await self._publish_event(event)
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.error("Job %s (checklist.parsing) failed: %s", submission.job_id, exc)
            event = ChecklistParsingFailed(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                error=str(exc),
            )
            await self._publish_event(event)

    async def _handle_checklist_matching(self, submission: ChecklistMatching) -> None:
        """Handle checklist analysis against tailored resume."""
        try:
            checklist: Checklist = await asyncio.to_thread(
                checklist_matching, submission.checklist, submission.resume_structure
            )
            event = ChecklistMatchingCompleted(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                checklist=checklist,
            )
            await self._publish_event(event)
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.error("Job %s (checklist.matching) failed: %s", submission.job_id, exc)
            event = ChecklistMatchingFailed(
                job_id=submission.job_id,
                timestamp=self._now_iso(),
                error=str(exc),
            )
            await self._publish_event(event)

    async def _publish_event(self, event: EventBase) -> None:
        if self._events_exchange is None:
            LOGGER.error(
                "Events exchange not initialised; unable to publish event for job %s",
                event.job_id,
            )
            return

        payload = event.model_dump(by_alias=True, mode="json")

        message = Message(
            json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,
            headers={"jobId": event.job_id},
        )

        await self._events_exchange.publish(message, routing_key=f"job.{payload['type']}")

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(UTC).isoformat()


__all__ = ["Settings", "OrchestratorService"]
