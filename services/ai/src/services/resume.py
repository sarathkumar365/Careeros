from __future__ import annotations

import json
import logging
from typing import Any

from src.openai_provider import OpenAIProvider
from src.types.checklist import Checklist

LOGGER = logging.getLogger("ai.services.resume")

# Initialize OpenAI provider
openai_provider = OpenAIProvider()


def resume_parsing(
    raw_resume_content: str,
    json_schema: dict[str, Any],
) -> dict[str, Any]:
    """
    Parse raw resume text into structured format using AI.

    Args:
        raw_resume_content: Raw resume content to parse
        json_schema: JSON Schema defining the expected structure

    Returns:
        Structured resume data matching the JSON schema
    """
    system_prompt = (
        "Extract structured data from resumes. Only include factual information from the source."
    )
    user_prompt = f"Resume: {raw_resume_content}"

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
                "name": "resume_structure",
                "schema": json_schema,
                "strict": True,
            },
        },
        n=1,  # Generate single completion only
    )

    # Parse the response
    content = response.choices[0].message.content
    if content is None:
        # this is unlikely to happen but anyway
        raise ValueError("OpenAI returned empty response")

    parsed_data = json.loads(content)
    LOGGER.info("parsed resume structure")

    return parsed_data


def resume_tailoring(
    checklist: Checklist,
    resume_structure: dict[str, Any],
    json_schema: dict[str, Any],
) -> dict[str, Any]:
    """
    Tailor an existing resume to match job requirements.

    Args:
        checklist: Job requirements checklist with fulfilled status from matching
        resume_structure: Parsed resume data in json_schema format
        json_schema: JSON Schema defining the expected structure

    Returns:
        Tailored resume data matching the JSON schema
    """
    system_prompt = """You are an expert resume writer and career coach. Your task is to tailor a resume to incorporate specific keywords selected by the user.

The checklist includes a "needTailoring" array containing keywords the user wants to add/emphasize in their resume. The application trusts the user's judgment that they possess these skills.

For EACH keyword in needTailoring:

SKILLS SECTION (MANDATORY):
- ALWAYS ADD the keyword to the skills section if not already present
- Make it prominent and well-placed among other skills
- Group similar technologies together logically
- This is REQUIRED for every keyword in needTailoring - NO EXCEPTIONS

SUMMARY SECTION (HIGH PRIORITY):
- If a summary exists, tailor it to emphasize relevant experience for this specific job
- Incorporate high-priority keywords from needTailoring naturally into the summary
- Keep it concise (2-3 sentences maximum)
- Highlight the candidate's strongest relevant qualifications
- Make it compelling and job-specific
- IMPORTANT: Use the summary as the primary place for keywords that are HARD to fit into work experiences, such as:
  * Soft skills (e.g., "strong communication", "team leadership", "problem-solving")
  * Availability/preferences (e.g., "willing to travel", "open to relocation", "flexible schedule")
  * Personal attributes (e.g., "quick learner", "detail-oriented", "self-motivated")
  * Certifications or qualifications that don't have dedicated sections
- If no summary exists and there are soft skills or attributes in needTailoring, CREATE a brief professional summary

BULLET POINTS & EXPERIENCES (OPTIONAL):
1. Find the requirement in the checklist that contains this keyword (provides context about how it's used)
2. Identify existing experiences/bullet points that are RELATED or RELEVANT to this keyword
3. IF you find relevant experiences, tailor those bullet points to naturally incorporate the keyword
4. IF you CANNOT find any relevant experiences, SKIP bullet point tailoring for this keyword
5. Use intelligent judgment - only add to experiences where it makes contextual sense

Examples of good bullet point tailoring:
- "deployed applications to cloud" → "deployed applications to AWS" (if AWS in needTailoring)
- "built web applications" → "built web applications using React" (if React in needTailoring)
- "managed databases" → "managed PostgreSQL databases" (if PostgreSQL in needTailoring)

DO NOT force keywords into completely unrelated experiences. It's better to skip bullet point tailoring than to make it sound unnatural.

Additional optimization:
1. REORDER content to prioritize experiences that use needTailoring keywords
2. QUANTIFY achievements where possible (if data exists)
3. Make the keyword usage feel natural, not keyword-stuffed

Return the complete resume with needTailoring cleared (empty array [])."""

    user_prompt = f"""Job Requirements Analysis (from matching):
{checklist.model_dump_json(indent=2)}

Current Resume:
{json.dumps(resume_structure, indent=2)}

Tailor this resume to maximize fit for the job requirements. Remember: maintain complete honesty and the exact JSON schema structure."""

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
                "name": "tailored_resume",
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

    tailored_resume = json.loads(content)
    LOGGER.info("completed resume tailoring")

    return tailored_resume


__all__ = [
    "resume_tailoring",
    "resume_parsing",
]
