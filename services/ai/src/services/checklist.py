"""Analyze resume against JD checklist using LLM."""

from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import TypeAdapter

from ..openai_provider import OpenAIProvider
from ..types.checklist import Checklist

LOGGER = logging.getLogger("ai.services.checklist")

# Initialize OpenAI provider
openai_provider = OpenAIProvider()


def checklist_matching(checklist: Checklist, resume_structure: dict[str, Any]) -> Checklist:
    """
    Match resume against job requirements checklist.

    Args:
        checklist: Job requirements checklist with fulfilled=False
        resume_structure: Parsed resume data in JSON format

    Returns:
        Updated checklist with fulfilled status and reason for unfulfilled requirements
    """
    system_prompt = """You are a resume-to-job matching expert. Your task is to accurately determine which job requirements are fulfilled by the candidate's resume.

For each requirement:
1. For EACH individual keyword in the keywords array:
   - Check if it appears in the resume (case-insensitive, allow variations like "JavaScript"/"JS", "React"/"React.js")
   - Set isFulfilled=true for that specific keyword if found, false otherwise
2. After checking all keywords, determine if the overall requirement is fulfilled:
   - match_type "all": requirement fulfilled ONLY if ALL keywords have isFulfilled=true
   - match_type "any": requirement fulfilled if AT LEAST ONE keyword has isFulfilled=true
3. For requirements with years_required, also verify sufficient years of experience
4. Set requirement fulfilled=true ONLY if the requirement is clearly met based on match_type logic
5. Be strict but fair - don't mark as fulfilled if evidence is weak or ambiguous
6. For the reason field:
   - If fulfilled=true: set reason to empty string ""
   - If fulfilled=false: provide a brief explanation of what is missing or why it's not fulfilled
   - Focus on specific gaps, contradictions, or missing information
   - Examples: "Systems integration is evidenced but reporting tools are not clearly mentioned or detailed."
              "No mention of willingness or ability to travel is provided."
              "Resume mentions graduation from Computer Science, but currently enrolled in a general Business Information Technology without specific confirmation of a major in Computer Engineering or a directly related field."

Keep needTailoring as empty array [] (will be populated by user in frontend).

Return the complete checklist with updated keyword-level and requirement-level fulfilled status."""

    user_prompt = f"""Job Requirements Checklist:
{checklist.model_dump_json(indent=2)}

Candidate Resume:
{json.dumps(resume_structure, indent=2)}

Analyze the resume against each requirement and return the updated checklist with fulfilled status."""

    # Convert Pydantic model to JSON schema for structured output
    type_adapter = TypeAdapter(Checklist)
    json_schema = type_adapter.json_schema()

    # Call OpenAI with structured output
    response = openai_provider.client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "checklist_matching",
                "schema": json_schema,
                "strict": True,
            },
        },
        n=1,  # Generate single completion only
    )

    # Parse the response
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("OpenAI returned empty response")

    parsed_data = json.loads(content)
    LOGGER.info("completed checklist matching analysis")

    # Validate and convert to Checklist model
    matched_checklist = Checklist.model_validate(parsed_data)
    return matched_checklist


def checklist_parsing(
    job_description: str,
) -> Checklist:
    """
    Parse job description into structured checklist using AI.

    Args:
        job_description: Raw job description text to parse

    Returns:
        Structured Checklist with categorized requirements
    """
    system_prompt = """You are a job description analyzer. Extract requirements from job postings into a structured checklist.

Categorize requirements into:
- Hard Requirements: Provable, measurable qualifications (technical skills, degrees, years of experience)
- Soft Requirements: Interpersonal and behavioral skills (communication, leadership, problem-solving)
- Preferred Skills: Nice-to-have qualifications (bonus technologies, additional certifications)

For each requirement:
- Extract the full requirement text preserving context
- Identify atomic keywords that can be matched against a resume
- For each keyword, create a KeywordItem object: {keyword: "KeywordName", isFulfilled: false}
- Determine match_type: "all" if ALL keywords must be present, "any" if ANY keyword suffices
- Extract years_required if explicitly mentioned
- Set fulfilled to false (will be updated during matching phase)
- Set reason to empty string "" (will be populated during matching phase if unfulfilled)

Initialize needTailoring as empty array [] (will be populated by user selection).

Return empty arrays if no requirements found in that category."""

    user_prompt = f"Job Description:\n\n{job_description}"

    # Convert Pydantic model to JSON schema for structured output
    type_adapter = TypeAdapter(Checklist)
    json_schema = type_adapter.json_schema()

    # Call OpenAI with structured output
    response = openai_provider.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "checklist_structure",
                "schema": json_schema,
                "strict": True,
            },
        },
        n=1,  # Generate single completion only
    )

    # Parse the response
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("OpenAI returned empty response")

    parsed_data = json.loads(content)
    LOGGER.info("parsed job description checklist")

    # Validate and convert to Checklist model
    checklist = Checklist.model_validate(parsed_data)
    return checklist


__all__ = ["checklist_parsing", "checklist_matching"]
