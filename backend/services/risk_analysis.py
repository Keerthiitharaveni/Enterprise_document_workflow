"""OpenAI-powered risk analysis for approval requests."""

import json
import os
from decimal import Decimal
from typing import Any, Mapping

from openai import OpenAI


RISK_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "risk_score": {"type": "string", "enum": ["low", "medium", "high"]},
        "summary": {"type": "string"},
        "flags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["risk_score", "summary", "flags"],
    "additionalProperties": False,
}


def _validate_risk_result(result: object) -> dict[str, Any]:
    """Reject malformed AI output before it reaches the rest of the application."""
    if not isinstance(result, dict) or set(result) != {"risk_score", "summary", "flags"}:
        raise ValueError("The AI response did not match the required risk-analysis format.")

    risk_score = result["risk_score"]
    summary = result["summary"]
    flags = result["flags"]
    if risk_score not in {"low", "medium", "high"}:
        raise ValueError("The AI response contains an invalid risk score.")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("The AI response contains an invalid summary.")
    if not isinstance(flags, list) or not all(isinstance(flag, str) and flag.strip() for flag in flags):
        raise ValueError("The AI response contains invalid risk flags.")

    return {"risk_score": risk_score, "summary": summary.strip(), "flags": flags}


def analyze_request(
    *,
    title: str,
    description: str | None,
    amount: Decimal | str | float,
    metadata: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Analyze an approval request and return its validated risk assessment."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY must be set in .env or the environment.")

    request_details = {
        "title": title,
        "description": description or "Not provided",
        "amount": str(amount),
        "metadata_and_vendor_information": dict(metadata or {}),
    }

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=os.getenv("OPENAI_RISK_MODEL", "gpt-4.1-mini"),
        instructions=(
            "You are a careful enterprise approval risk analyst. Assess only the supplied request "
            "information. Return a low, medium, or high risk score, a two-to-three sentence "
            "plain-English summary, and short risk flags. Do not invent facts."
        ),
        input=json.dumps(request_details, default=str),
        # Structured JSON lets the application safely consume AI output instead of parsing prose.
        text={
            "format": {
                "type": "json_schema",
                "name": "approval_risk_analysis",
                "strict": True,
                "schema": RISK_RESPONSE_SCHEMA,
            }
        },
    )

    try:
        result = json.loads(response.output_text)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("The AI response was not valid JSON.") from exc

    return _validate_risk_result(result)
