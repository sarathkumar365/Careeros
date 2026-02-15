"""Pydantic models for job description checklist structure."""

#
# IF U CHANGE ANYTHING
# U MUST CHANGE ACROSS STACK
#

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class KeywordItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"required": ["keyword", "isFulfilled"]},
    )
    keyword: str
    is_fulfilled: bool = Field(alias="isFulfilled")


class ChecklistRequirement(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "required": [
                "requirement",
                "keywords",
                "matchType",
                "yearsRequired",
                "fulfilled",
                "reason",
            ]
        },
    )
    requirement: str
    keywords: list[KeywordItem]
    match_type: Literal["all", "any"] = Field(alias="matchType")
    years_required: int | None = Field(default=None, alias="yearsRequired")
    fulfilled: bool
    reason: str


class Checklist(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "required": [
                "hardRequirements",
                "softRequirements",
                "preferredSkills",
                "needTailoring",
            ]
        },
    )
    hard_requirements: list[ChecklistRequirement] = Field(alias="hardRequirements")
    soft_requirements: list[ChecklistRequirement] = Field(alias="softRequirements")
    preferred_skills: list[ChecklistRequirement] = Field(alias="preferredSkills")
    need_tailoring: list[str] = Field(alias="needTailoring")


__all__ = ["ChecklistRequirement", "Checklist"]
