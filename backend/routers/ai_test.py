"""TEMPORARY DEVELOPMENT TEST ONLY: unauthenticated AI risk-analysis endpoint."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from services.risk_analysis import analyze_request


router = APIRouter(tags=["Temporary development AI test"])


class AITestRequest(BaseModel):
    """Input accepted by the temporary local AI test endpoint."""

    title: str
    description: str
    amount: float
    metadata: dict[str, Any] | None = None


@router.post(
    "/ai-test",
    summary="TEMPORARY DEVELOPMENT TEST ONLY: analyze request risk",
    description="Calls the AI risk-analysis service without authentication or database access.",
)
def test_ai_risk_analysis(request: AITestRequest) -> dict[str, Any]:
    """TEMPORARY DEVELOPMENT TEST ONLY: return an AI risk analysis without saving it."""
    return analyze_request(
        title=request.title,
        description=request.description,
        amount=request.amount,
        metadata=request.metadata,
    )
