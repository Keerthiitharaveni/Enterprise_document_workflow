"""Authenticated endpoints for the sequential document approval workflow."""

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies import get_current_user
from models import (
    ApprovalStep,
    AuditLog,
    Request as ApprovalRequest,
    RequestStatus,
    StepDecision,
    User,
    UserRole,
)
from schemas import (
    ApprovalStepResponse,
    AuditLogResponse,
    RequestCreate,
    RequestCreateResponse,
    RequestDecision,
    RequestListItem,
    UserResponse,
)


router = APIRouter(tags=["Requests"])


APPROVAL_STAGE_LABELS = {
    "manager": "Manager approval",
    "finance": "Finance approval",
    "procurement": "Procurement approval",
}


# ---------------------------------------------------------
# SUPPORTING DOCUMENT CONFIGURATION
# ---------------------------------------------------------

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf": "PDF",
    ".doc": "DOC",
    ".docx": "DOCX",
    ".csv": "CSV",
}

ALLOWED_DOCUMENT_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/csv",
    "text/plain",
}

UPLOAD_DIRECTORY = Path("uploads") / "supporting_documents"

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB


def _loaded_request_query(db: Session):
    return db.query(ApprovalRequest).options(
        selectinload(ApprovalRequest.creator),
        selectinload(
            ApprovalRequest.approval_steps
        ).selectinload(
            ApprovalStep.approver
        ),
    )


def _current_step(
    approval_request: ApprovalRequest,
) -> ApprovalStep | None:
    """Return the sole actionable step in this sequential workflow."""

    if approval_request.status != RequestStatus.PENDING:
        return None

    return next(
        (
            step
            for step in sorted(
                approval_request.approval_steps,
                key=lambda item: item.step_order,
            )
            if step.decision == StepDecision.PENDING
        ),
        None,
    )


def _request_data(
    approval_request: ApprovalRequest,
) -> dict:
    """Convert ORM request to API response data."""

    current_step = _current_step(
        approval_request
    )

    total_steps = len(
        approval_request.approval_steps
    )

    metadata = (
        approval_request.metadata_ or {}
    )

    if current_step is not None:
        current_role = (
            current_step.approver.application_role
        )

        current_stage = APPROVAL_STAGE_LABELS.get(
            current_role or "",
            "Approval pending",
        )

        current_approver_name = (
            current_step.approver.name
        )

        current_step_order = (
            current_step.step_order
        )

    elif approval_request.status == RequestStatus.APPROVED:
        current_role = None
        current_stage = "Completed"
        current_approver_name = None
        current_step_order = total_steps or None

    elif approval_request.status == RequestStatus.REJECTED:
        current_role = None
        current_stage = "Rejected"
        current_approver_name = None

        current_step_order = next(
            (
                step.step_order
                for step in approval_request.approval_steps
                if step.decision
                == StepDecision.REJECTED
            ),
            None,
        )

    else:
        current_role = None
        current_stage = "Draft"
        current_approver_name = None
        current_step_order = None

    return {
        "id": approval_request.id,
        "title": approval_request.title,
        "description": approval_request.description,
        "amount": approval_request.amount,
        "status": approval_request.status.value,
        "created_by": approval_request.created_by,
        "created_by_name": (
            approval_request.creator.name
        ),
        "created_at": approval_request.created_at,

        # Common fields.
        "request_type": metadata.get(
            "request_type",
            "purchase",
        ),
        "vendor": metadata.get("vendor"),

        # Leave fields.
        "leave_type": metadata.get(
            "leave_type"
        ),
        "from_date": metadata.get(
            "from_date"
        ),
        "to_date": metadata.get(
            "to_date"
        ),
        "number_of_days": metadata.get(
            "number_of_days"
        ),
        "reason": metadata.get(
            "reason"
        ),
        "additional_notes": metadata.get(
            "additional_notes"
        ),
        "manager_email": metadata.get(
            "manager_email"
        ),

        # Supporting document fields.
        "document_name": metadata.get(
            "document_name"
        ),
        "document_type": metadata.get(
            "document_type"
        ),
        "document_path": metadata.get(
            "document_path"
        ),

        # Workflow fields.
        "current_stage": current_stage,
        "current_approver_name": (
            current_approver_name
        ),
        "current_approver_role": current_role,
        "current_step_order": (
            current_step_order
        ),
        "total_approval_steps": total_steps,

        "approval_steps": [
            ApprovalStepResponse(
                id=step.id,
                approver_id=step.approver_id,
                approver_name=step.approver.name,
                approver_application_role=(
                    step.approver.application_role
                ),
                step_order=step.step_order,
                decision=step.decision.value,
                decision_notes=step.decision_notes,
                decided_at=step.decided_at,
                is_current=(
                    current_step is not None
                    and step.id
                    == current_step.id
                ),
            )
            for step in sorted(
                approval_request.approval_steps,
                key=lambda item: item.step_order,
            )
        ],
    }


def _can_access_request(
    approval_request: ApprovalRequest,
    current_user: User,
) -> bool:
    """Check whether the authenticated user may inspect the request."""

    if (
        current_user.role == UserRole.ADMIN
        or approval_request.created_by
        == current_user.id
    ):
        return True

    current_step = _current_step(
        approval_request
    )

    return (
        current_step is not None
        and current_step.approver_id
        == current_user.id
    )


def _require_request_access(
    approval_request: ApprovalRequest,
    current_user: User,
) -> None:
    if not _can_access_request(
        approval_request,
        current_user,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Not authorized to access "
                "this request."
            ),
        )


@router.get(
    "/requests",
    response_model=list[RequestListItem],
)
def list_requests(
    request_status: RequestStatus | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[RequestListItem]:
    """Return authenticated user's requests."""

    query = _loaded_request_query(db)

    if request_status is not None:
        query = query.filter(
            ApprovalRequest.status
            == request_status
        )

    if current_user.role == UserRole.REQUESTER:
        query = query.filter(
            ApprovalRequest.created_by
            == current_user.id
        )

    elif current_user.role == UserRole.APPROVER:
        query = query.filter(
            ApprovalRequest.status
            == RequestStatus.PENDING
        )

    approval_requests = (
        query
        .order_by(
            ApprovalRequest.id.desc()
        )
        .all()
    )

    if current_user.role == UserRole.APPROVER:
        approval_requests = [
            request
            for request in approval_requests
            if (
                (
                    current_step
                    := _current_step(request)
                )
                is not None
                and current_step.approver_id
                == current_user.id
            )
        ]

    return [
        RequestListItem(
            **_request_data(request)
        )
        for request in approval_requests
    ]


@router.get(
    "/requests/{request_id}",
    response_model=RequestListItem,
)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> RequestListItem:
    """Return one request after access validation."""

    approval_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == request_id
        )
        .first()
    )

    if approval_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )

    _require_request_access(
        approval_request,
        current_user,
    )

    return RequestListItem(
        **_request_data(approval_request)
    )


@router.get(
    "/requests/{request_id}/audit",
    response_model=list[AuditLogResponse],
)
def get_request_audit(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[AuditLogResponse]:
    """Return the audit trail for an allowed participant."""

    approval_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == request_id
        )
        .first()
    )

    if approval_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )

    _require_request_access(
        approval_request,
        current_user,
    )

    audit_entries = (
        db.query(AuditLog)
        .filter(
            AuditLog.request_id
            == request_id
        )
        .order_by(
            AuditLog.timestamp.asc(),
            AuditLog.id.asc(),
        )
        .all()
    )

    return [
        AuditLogResponse(
            id=entry.id,
            actor_id=entry.actor_id,
            action=entry.action,
            details=entry.details,
            timestamp=entry.timestamp,
        )
        for entry in audit_entries
    ]


@router.post(
    "/requests/{request_id}/decide",
    response_model=RequestListItem,
)
def decide_request(
    request_id: int,
    payload: RequestDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> RequestListItem:
    """Record the authenticated current approver's decision."""

    approval_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == request_id
        )
        .first()
    )

    if approval_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )

    if current_user.role != UserRole.APPROVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only approvers may decide "
                "requests."
            ),
        )

    if approval_request.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This request is already "
                "decided."
            ),
        )

    approval_step = _current_step(
        approval_request
    )

    if approval_step is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This request has no actionable "
                "approval step."
            ),
        )

    if (
        approval_step.approver_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This request is not assigned "
                "to the authenticated approver."
            ),
        )

    approval_step.decision = StepDecision(
        payload.decision
    )

    approval_step.decision_notes = (
        payload.notes
    )

    approval_step.decided_at = (
        datetime.now(timezone.utc)
    )

    if (
        approval_step.decision
        == StepDecision.REJECTED
    ):
        approval_request.status = (
            RequestStatus.REJECTED
        )

    elif all(
        step.decision
        == StepDecision.APPROVED
        for step
        in approval_request.approval_steps
    ):
        approval_request.status = (
            RequestStatus.APPROVED
        )

    else:
        approval_request.status = (
            RequestStatus.PENDING
        )

    db.add(
        AuditLog(
            request_id=approval_request.id,
            actor_id=current_user.id,
            action=(
                "approval_decision_recorded"
            ),
            details={
                "approval_step_id": (
                    approval_step.id
                ),
                "step_order": (
                    approval_step.step_order
                ),
                "decision": (
                    approval_step.decision.value
                ),
                "notes": (
                    approval_step.decision_notes
                ),
            },
        )
    )

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to record "
                "the decision."
            ),
        ) from exc

    refreshed_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == request_id
        )
        .one()
    )

    return RequestListItem(
        **_request_data(
            refreshed_request
        )
    )


def _select_approver(
    db: Session,
    application_role: str,
) -> User:
    """Select an approver within the requested application role."""

    candidates = (
        db.query(User)
        .filter(
            User.role
            == UserRole.APPROVER,
            User.application_role
            == application_role,
        )
        .order_by(User.id)
        .all()
    )

    if not candidates:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                f"At least one "
                f"{application_role} approver "
                "is required to create "
                "this request."
            ),
        )

    last_step = (
        db.query(ApprovalStep)
        .join(
            User,
            ApprovalStep.approver_id
            == User.id,
        )
        .filter(
            User.application_role
            == application_role
        )
        .order_by(
            ApprovalStep.id.desc()
        )
        .first()
    )

    if last_step:
        for index, candidate in enumerate(
            candidates
        ):
            if (
                candidate.id
                == last_step.approver_id
            ):
                return candidates[
                    (index + 1)
                    % len(candidates)
                ]

    return candidates[0]


def _secondary_approver_role(
    request_type: str,
) -> str:
    """Select the second approval role for high-value requests."""

    return (
        "procurement"
        if request_type == "purchase"
        else "finance"
    )


@router.post(
    "/requests",
    response_model=RequestCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> RequestCreateResponse:
    """
    Create a request with sequential approval steps.

    Leave:
        - No amount.
        - Exact manager selected by manager email.
        - Only that manager receives the approval task.

    Purchase / Travel / CapEx:
        - Amount required.
        - Below ₹50,000 -> Manager only.
        - ₹50,000 or above -> Manager + second approver.
    """

    if current_user.role not in {
        UserRole.REQUESTER,
        UserRole.ADMIN,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only requester or admin "
                "users may create requests."
            ),
        )

    metadata = {
        "request_type": payload.request_type,
    }

    selected_approvers: list[User]

    # ---------------------------------------------------------
    # LEAVE
    # ---------------------------------------------------------
    if payload.request_type == "leave":

        # Leave must never contain a monetary amount.
        if payload.amount is not None:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Leave requests must not "
                    "contain an amount."
                ),
            )

        if not payload.leave_type:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Leave type is required."
                ),
            )

        if (
            not payload.from_date
            or not payload.to_date
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "From date and to date "
                    "are required for "
                    "leave requests."
                ),
            )

        if (
            payload.to_date
            < payload.from_date
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "To date cannot be "
                    "before from date."
                ),
            )

        if not payload.reason:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Reason is required "
                    "for leave requests."
                ),
            )

        # The requester must specify exactly which
        # manager should receive this Leave request.
        if not payload.manager_email:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Manager email is required "
                    "for leave requests."
                ),
            )

        manager_email = (
            payload.manager_email
            .strip()
            .lower()
        )

        # Find EXACTLY the manager account matching
        # the email entered by the requester.
        manager = (
            db.query(User)
            .filter(
                User.email == manager_email,
                User.role
                == UserRole.APPROVER,
                User.application_role
                == "manager",
            )
            .first()
        )

        if manager is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "No manager account was found "
                    "for the provided email."
                ),
            )

        calculated_days = (
            payload.to_date
            - payload.from_date
        ).days + 1

        metadata.update(
            {
                "leave_type": (
                    payload.leave_type
                ),
                "from_date": (
                    payload.from_date.isoformat()
                ),
                "to_date": (
                    payload.to_date.isoformat()
                ),
                "number_of_days": (
                    calculated_days
                ),
                "reason": payload.reason,
                "additional_notes": (
                    payload.additional_notes
                ),
                "manager_email": manager_email,
            }
        )

        # IMPORTANT:
        # Only the exact manager selected by email
        # receives the approval step.
        selected_approvers = [manager]

    # ---------------------------------------------------------
    # PURCHASE / TRAVEL / CAPEX
    # ---------------------------------------------------------
    else:

        if payload.amount is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Amount is required for "
                    f"{payload.request_type} "
                    "requests."
                ),
            )

        if payload.vendor:
            metadata["vendor"] = (
                payload.vendor
            )

        step_roles = ["manager"]

        if payload.amount >= 50000:
            step_roles.append(
                _secondary_approver_role(
                    payload.request_type
                )
            )

        selected_approvers = [
            _select_approver(
                db,
                application_role,
            )
            for application_role
            in step_roles
        ]

    # ---------------------------------------------------------
    # CREATE REQUEST
    # ---------------------------------------------------------
    approval_request = ApprovalRequest(
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        status=RequestStatus.PENDING,
        created_by=current_user.id,
        metadata_=metadata,
    )

    db.add(approval_request)

    try:
        db.flush()

        # Create the approval step(s).
        db.add_all(
            [
                ApprovalStep(
                    request_id=(
                        approval_request.id
                    ),
                    approver_id=(
                        approver.id
                    ),
                    step_order=order,
                )
                for order, approver
                in enumerate(
                    selected_approvers,
                    start=1,
                )
            ]
        )

        db.add(
            AuditLog(
                request_id=(
                    approval_request.id
                ),
                actor_id=current_user.id,
                action="request_created",
                details={
                    "title": (
                        approval_request.title
                    ),
                    "amount": (
                        str(
                            approval_request.amount
                        )
                        if approval_request.amount
                        is not None
                        else None
                    ),
                    "request_type": (
                        payload.request_type
                    ),
                    "manager_email": (
                        metadata.get(
                            "manager_email"
                        )
                    ),
                    "approval_step_count": (
                        len(
                            selected_approvers
                        )
                    ),
                },
            )
        )

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to create the request.",
        ) from exc

    created_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == approval_request.id
        )
        .one()
    )

    return RequestCreateResponse(
        **_request_data(created_request)
    )


@router.post(
    "/requests/{request_id}/document",
)
async def upload_supporting_document(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Upload one optional supporting document.

    Allowed file types:
        PDF
        DOC
        DOCX
        CSV

    Maximum size:
        10 MB
    """

    approval_request = (
        _loaded_request_query(db)
        .filter(
            ApprovalRequest.id
            == request_id
        )
        .first()
    )

    if approval_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )

    # Only request creator or admin can upload.
    if (
        current_user.role != UserRole.ADMIN
        and approval_request.created_by
        != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the request creator "
                "or admin may upload "
                "a supporting document."
            ),
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A file must be selected."
            ),
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if (
        extension
        not in ALLOWED_DOCUMENT_EXTENSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. "
                "Allowed types are PDF, "
                "DOC, DOCX and CSV."
            ),
        )

    if (
        file.content_type
        and file.content_type
        not in ALLOWED_DOCUMENT_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The selected file type "
                "is not supported."
            ),
        )

    file_bytes = await file.read()

    if (
        len(file_bytes)
        > MAX_DOCUMENT_SIZE
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "Supporting document must "
                "be 10 MB or smaller."
            ),
        )

    UPLOAD_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = (
        f"request_{request_id}_"
        f"{uuid4().hex}"
        f"{extension}"
    )

    destination = (
        UPLOAD_DIRECTORY
        / stored_filename
    )

    destination.write_bytes(
        file_bytes
    )

    metadata = dict(
        approval_request.metadata_ or {}
    )

    metadata.update(
        {
            "document_name": Path(
                file.filename
            ).name,
            "document_type": (
                ALLOWED_DOCUMENT_EXTENSIONS[
                    extension
                ]
            ),
            "document_path": str(
                destination
            ),
        }
    )

    approval_request.metadata_ = (
        metadata
    )

    db.add(
        AuditLog(
            request_id=approval_request.id,
            actor_id=current_user.id,
            action=(
                "supporting_document_uploaded"
            ),
            details={
                "file_name": Path(
                    file.filename
                ).name,
                "file_type": (
                    ALLOWED_DOCUMENT_EXTENSIONS[
                        extension
                    ]
                ),
                "file_size": len(
                    file_bytes
                ),
            },
        )
    )

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        if destination.exists():
            destination.unlink()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to save the "
                "supporting document."
            ),
        ) from exc

    return {
        "message": (
            "Supporting document uploaded "
            "successfully."
        ),
        "request_id": request_id,
        "file_name": Path(
            file.filename
        ).name,
        "file_type": (
            ALLOWED_DOCUMENT_EXTENSIONS[
                extension
            ]
        ),
    }


@router.get(
    "/users",
    response_model=list[UserResponse],
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[UserResponse]:
    """Back the existing admin users screen."""

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only admins may view users."
            ),
        )

    return [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            application_role=(
                user.application_role
            ),
        )
        for user in db.query(User)
        .order_by(User.id)
        .all()
    ]