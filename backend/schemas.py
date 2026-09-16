"""Pydantic schemas used by the request API."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


class RequestCreate(BaseModel):
    """Data required to create an approval request."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    amount: Decimal = Field(gt=0)
    request_type: Literal["leave", "purchase", "capex", "travel"] = "purchase"
    vendor: str | None = Field(default=None, max_length=255)


class RequestDecision(BaseModel):
    """An approver's decision for one assigned approval step."""

    decision: Literal["approved", "rejected"]
    notes: str | None = None


class ApprovalStepResponse(BaseModel):
    """One approval assignment created for a request."""

    id: int
    approver_id: int
    approver_name: str
    approver_application_role: str | None
    step_order: int
    decision: str
    decision_notes: str | None
    decided_at: datetime | None
    is_current: bool


class AuditLogResponse(BaseModel):
    """One recorded event in an approval request's audit trail."""

    id: int
    actor_id: int
    action: str
    details: dict[str, Any]
    timestamp: datetime


class RequestCreateResponse(BaseModel):
    """The request and approval steps created by POST /requests."""

    id: int
    title: str
    description: str | None
    amount: Decimal
    status: str
    created_by: int
    created_at: datetime
    request_type: str
    vendor: str | None
    created_by_name: str
    current_stage: str
    current_approver_name: str | None
    current_approver_role: str | None
    current_step_order: int | None
    total_approval_steps: int
    approval_steps: list[ApprovalStepResponse]


class RequestListItem(BaseModel):
    """Basic request details and its approval steps for GET /requests."""

    id: int
    title: str
    description: str | None
    amount: Decimal
    status: str
    created_by: int
    created_at: datetime
    request_type: str
    vendor: str | None
    created_by_name: str
    current_stage: str
    current_approver_name: str | None
    current_approver_role: str | None
    current_step_order: int | None
    total_approval_steps: int
    approval_steps: list[ApprovalStepResponse]


class UserResponse(BaseModel):
    """Safe user information for the existing admin users screen."""

    id: int
    name: str
    email: str
    role: str
    application_role: str | None
