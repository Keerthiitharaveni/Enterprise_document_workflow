"""Protected API route for AI risk analysis of approval requests."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Request as ApprovalRequest
from models import User, UserRole
from services.risk_analysis import analyze_request


router = APIRouter(tags=["AI analysis"])


@router.post("/requests/{request_id}/analyze")
def analyze_approval_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate and save a risk assessment for one approval request."""
    approval_request = db.get(ApprovalRequest, request_id)
    if approval_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    # Only the request creator or an admin may analyze this request.
    if approval_request.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to analyze this request.")

    try:
        analysis = analyze_request(
            title=approval_request.title,
            description=approval_request.description,
            amount=approval_request.amount,
            metadata=approval_request.metadata_,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to analyze this request at this time.",
        ) from exc

    # Assign a new dictionary so SQLAlchemy persists ai_analysis while keeping existing metadata.
    updated_metadata = dict(approval_request.metadata_ or {})
    updated_metadata["ai_analysis"] = analysis
    approval_request.metadata_ = updated_metadata
    db.commit()
    db.refresh(approval_request)

    return analysis
