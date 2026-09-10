"""Endpoints for creating enterprise approval requests."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies import get_current_user
from models import ApprovalStep, AuditLog, Request as ApprovalRequest, RequestStatus, StepDecision, User, UserRole
from schemas import (
    ApprovalStepResponse,
    AuditLogResponse,
    RequestCreate,
    RequestCreateResponse,
    RequestDecision,
    RequestListItem,
)


router = APIRouter(tags=["Requests"])


@router.get("/requests", response_model=list[RequestListItem])
def list_requests(
    request_status: RequestStatus | None = Query(default=None, alias="status"),
    approver_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
) -> list[RequestListItem]:
    """Return approval requests, optionally filtered by status or assigned approver."""
    query = db.query(ApprovalRequest).options(selectinload(ApprovalRequest.approval_steps))

    if request_status is not None:
        query = query.filter(ApprovalRequest.status == request_status)

    if approver_id is not None:
        # distinct() prevents duplicate requests if an approver has multiple steps on one request.
        query = query.join(ApprovalStep).filter(ApprovalStep.approver_id == approver_id).distinct()

    approval_requests = query.order_by(ApprovalRequest.id).all()
    return [
        RequestListItem(
            id=approval_request.id,
            title=approval_request.title,
            description=approval_request.description,
            amount=approval_request.amount,
            status=approval_request.status.value,
            created_by=approval_request.created_by,
            created_at=approval_request.created_at,
            approval_steps=[
                ApprovalStepResponse(
                    id=approval_step.id,
                    approver_id=approval_step.approver_id,
                    step_order=approval_step.step_order,
                    decision=approval_step.decision.value,
                )
                for approval_step in approval_request.approval_steps
            ],
        )
        for approval_request in approval_requests
    ]


@router.get("/requests/{request_id}", response_model=RequestListItem)
def get_request(request_id: int, db: Session = Depends(get_db)) -> RequestListItem:
    """Return one approval request and all of its approval steps."""
    approval_request = (
        db.query(ApprovalRequest)
        .options(selectinload(ApprovalRequest.approval_steps))
        .filter(ApprovalRequest.id == request_id)
        .first()
    )
    if approval_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    return RequestListItem(
        id=approval_request.id,
        title=approval_request.title,
        description=approval_request.description,
        amount=approval_request.amount,
        status=approval_request.status.value,
        created_by=approval_request.created_by,
        created_at=approval_request.created_at,
        approval_steps=[
            ApprovalStepResponse(
                id=approval_step.id,
                approver_id=approval_step.approver_id,
                step_order=approval_step.step_order,
                decision=approval_step.decision.value,
            )
            for approval_step in approval_request.approval_steps
        ],
    )


@router.get("/requests/{request_id}/audit", response_model=list[AuditLogResponse])
def get_request_audit(request_id: int, db: Session = Depends(get_db)) -> list[AuditLogResponse]:
    """Return one request's audit trail from oldest event to newest."""
    if db.get(ApprovalRequest, request_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    audit_entries = (
        db.query(AuditLog)
        .filter(AuditLog.request_id == request_id)
        .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
        .all()
    )
    return [
        AuditLogResponse(
            id=audit_entry.id,
            actor_id=audit_entry.actor_id,
            action=audit_entry.action,
            details=audit_entry.details,
            timestamp=audit_entry.timestamp,
        )
        for audit_entry in audit_entries
    ]


@router.post("/requests/{request_id}/decide", response_model=RequestListItem)
def decide_request(
    request_id: int, payload: RequestDecision, db: Session = Depends(get_db)
) -> RequestListItem:
    """Record an assigned approver's decision and update the request status."""
    approval_request = (
        db.query(ApprovalRequest)
        .options(selectinload(ApprovalRequest.approval_steps))
        .filter(ApprovalRequest.id == request_id)
        .first()
    )
    if approval_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    approver = db.get(User, payload.approver_id)
    if approver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approver user not found.")
    if approver.role != UserRole.APPROVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user is not an approver.",
        )

    assigned_steps = [
        approval_step
        for approval_step in approval_request.approval_steps
        if approval_step.approver_id == approver.id
    ]
    if not assigned_steps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The approver is not assigned to this request.",
        )

    approval_step = next(
        (step for step in assigned_steps if step.decision == StepDecision.PENDING),
        None,
    )
    if approval_step is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All approval steps assigned to this approver have already been decided.",
        )

    approval_step.decision = StepDecision(payload.decision)
    approval_step.decision_notes = payload.notes
    approval_step.decided_at = datetime.now(timezone.utc)

    if any(step.decision == StepDecision.REJECTED for step in approval_request.approval_steps):
        approval_request.status = RequestStatus.REJECTED
    elif all(step.decision == StepDecision.APPROVED for step in approval_request.approval_steps):
        approval_request.status = RequestStatus.APPROVED
    else:
        approval_request.status = RequestStatus.PENDING

    db.add(
        AuditLog(
            request_id=approval_request.id,
            actor_id=approver.id,
            action="approval_decision_recorded",
            details={
                "approval_step_id": approval_step.id,
                "decision": approval_step.decision.value,
                "notes": approval_step.decision_notes,
            },
        )
    )

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to record the decision.",
        ) from exc

    db.refresh(approval_request)
    for step in approval_request.approval_steps:
        db.refresh(step)

    return RequestListItem(
        id=approval_request.id,
        title=approval_request.title,
        description=approval_request.description,
        amount=approval_request.amount,
        status=approval_request.status.value,
        created_by=approval_request.created_by,
        created_at=approval_request.created_at,
        approval_steps=[
            ApprovalStepResponse(
                id=step.id,
                approver_id=step.approver_id,
                step_order=step.step_order,
                decision=step.decision.value,
            )
            for step in approval_request.approval_steps
        ],
    )


def _select_approvers(db: Session, step_count: int) -> list[User]:
    """Select approvers in a stable round-robin order across all requests."""
    approvers = db.query(User).filter(User.role == UserRole.APPROVER).order_by(User.id).all()
    if not approvers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one approver user is required to create a request.",
        )

    last_step = db.query(ApprovalStep).order_by(ApprovalStep.id.desc()).first()
    start_index = 0
    if last_step:
        for index, approver in enumerate(approvers):
            if approver.id == last_step.approver_id:
                start_index = (index + 1) % len(approvers)
                break

    return [approvers[(start_index + index) % len(approvers)] for index in range(step_count)]


@router.post("/requests", response_model=RequestCreateResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestCreateResponse:
    """Create a pending request, its approval steps, and its audit event."""
    if current_user.role not in {UserRole.REQUESTER, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only requester or admin users may create requests.",
        )

    step_count = 1 if payload.amount < 50000 else 2
    selected_approvers = _select_approvers(db, step_count)

    approval_request = ApprovalRequest(
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        status=RequestStatus.PENDING,
        created_by=current_user.id,
    )
    db.add(approval_request)
    db.flush()  # Allocate the request ID before creating linked records.

    approval_steps = [
        ApprovalStep(
            request_id=approval_request.id,
            approver_id=approver.id,
            step_order=step_order,
        )
        for step_order, approver in enumerate(selected_approvers, start=1)
    ]
    db.add_all(approval_steps)
    db.add(
        AuditLog(
            request_id=approval_request.id,
            actor_id=current_user.id,
            action="request_created",
            details={
                "title": approval_request.title,
                "amount": str(approval_request.amount),
                "approval_step_count": step_count,
            },
        )
    )

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the request.",
        ) from exc

    db.refresh(approval_request)
    for approval_step in approval_steps:
        db.refresh(approval_step)

    return RequestCreateResponse(
        id=approval_request.id,
        title=approval_request.title,
        description=approval_request.description,
        amount=approval_request.amount,
        status=approval_request.status.value,
        created_by=approval_request.created_by,
        created_at=approval_request.created_at,
        approval_steps=[
            ApprovalStepResponse(
                id=approval_step.id,
                approver_id=approval_step.approver_id,
                step_order=approval_step.step_order,
                decision=approval_step.decision.value,
            )
            for approval_step in approval_steps
        ],
    )
