"""Message type constants and payloads used across the AI service."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .checklist import Checklist

# ============================================================================
# MESSAGE TYPE CONSTANTS
# ============================================================================

RESUME_PARSING = "resume.parsing"
RESUME_PARSING_FAILED = "resume.parsing.failed"
RESUME_PARSING_COMPLETED = "resume.parsing.completed"

RESUME_TAILORING = "resume.tailoring"
RESUME_TAILORING_FAILED = "resume.tailoring.failed"
RESUME_TAILORING_COMPLETED = "resume.tailoring.completed"

CHECKLIST_PARSING = "checklist.parsing"
CHECKLIST_PARSING_FAILED = "checklist.parsing.failed"
CHECKLIST_PARSING_COMPLETED = "checklist.parsing.completed"

CHECKLIST_MATCHING = "checklist.matching"
CHECKLIST_MATCHING_FAILED = "checklist.matching.failed"
CHECKLIST_MATCHING_COMPLETED = "checklist.matching.completed"

# ============================================================================
# SUBMISSION PAYLOADS (incoming from queue)
# ============================================================================


class JobSubmissionBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    message_type: str = Field(alias="messageType")


class ChecklistParsing(JobSubmissionBase):
    job_description: str = Field(alias="jobDescription")


class ChecklistMatching(JobSubmissionBase):
    checklist: Checklist
    resume_structure: dict[str, Any] = Field(alias="resumeStructure")


class ResumeParsing(JobSubmissionBase):
    raw_resume_content: str = Field(alias="rawResumeContent")
    json_schema: dict[str, Any] = Field(alias="jsonSchema")


class ResumeTailoring(JobSubmissionBase):
    checklist: Checklist
    resume_structure: dict[str, Any] = Field(alias="resumeStructure")
    json_schema: dict[str, Any] = Field(alias="jsonSchema")


# ============================================================================
# COMPLETION EVENTS (outgoing to queue)
# ============================================================================


class EventBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    timestamp: str


class FailedEventBase(BaseModel):
    error: str


# Failed events


class ResumeParsingFailed(EventBase, FailedEventBase):
    type: Literal["resume.parsing.failed"] = RESUME_PARSING_FAILED


class ResumeTailoringFailed(EventBase, FailedEventBase):
    type: Literal["resume.tailoring.failed"] = RESUME_TAILORING_FAILED


class ChecklistParsingFailed(EventBase, FailedEventBase):
    type: Literal["checklist.parsing.failed"] = CHECKLIST_PARSING_FAILED


class ChecklistMatchingFailed(EventBase, FailedEventBase):
    type: Literal["checklist.matching.failed"] = CHECKLIST_MATCHING_FAILED


# Completed events


class ResumeParsingCompleted(EventBase):
    type: Literal["resume.parsing.completed"] = RESUME_PARSING_COMPLETED
    resume_structure: dict[str, Any] = Field(alias="resumeStructure")


class ResumeTailoringCompleted(EventBase):
    type: Literal["resume.tailoring.completed"] = RESUME_TAILORING_COMPLETED
    resume_structure: dict[str, Any] = Field(alias="resumeStructure")


class ChecklistParsingCompleted(EventBase):
    type: Literal["checklist.parsing.completed"] = CHECKLIST_PARSING_COMPLETED
    checklist: Checklist


class ChecklistMatchingCompleted(EventBase):
    type: Literal["checklist.matching.completed"] = CHECKLIST_MATCHING_COMPLETED
    checklist: Checklist


# Union types

TaskSuccess = Annotated[
    ResumeParsingCompleted
    | ResumeTailoringCompleted
    | ChecklistMatchingCompleted
    | ChecklistParsingCompleted,
    Field(discriminator="type"),
]

TaskFailed = Annotated[
    ResumeParsingFailed | ResumeTailoringFailed | ChecklistMatchingFailed | ChecklistParsingFailed,
    Field(discriminator="type"),
]

JobEventCompleted = TaskFailed | TaskSuccess


__all__ = [
    # Submissions
    "JobSubmissionBase",
    "ChecklistParsing",
    "ChecklistMatching",
    "ResumeParsing",
    "ResumeTailoring",
    # Completed events
    "ResumeParsingCompleted",
    "ResumeTailoringCompleted",
    "ChecklistParsingCompleted",
    "ChecklistMatchingCompleted",
    # Failed events
    "ResumeParsingFailed",
    "ResumeTailoringFailed",
    "ChecklistParsingFailed",
    "ChecklistMatchingFailed",
    # Union types
    "TaskSuccess",
    "TaskFailed",
    "JobEventCompleted",
]
