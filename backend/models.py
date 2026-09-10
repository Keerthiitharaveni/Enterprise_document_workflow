"""SQLAlchemy ORM models for the document approval workflow."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, Enum):
    REQUESTER = "requester"
    APPROVER = "approver"
    ADMIN = "admin"


class RequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class StepDecision(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Clerk's stable external identifier.  It is nullable only to support
    # existing Day 1 database rows until they are linked to a Clerk account.
    clerk_user_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole, name="user_role"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # The reverse sides of the three user foreign keys below.
    created_requests: Mapped[list[Request]] = relationship(back_populates="creator")
    assigned_steps: Mapped[list[ApprovalStep]] = relationship(back_populates="approver")
    audit_events: Mapped[list[AuditLog]] = relationship(back_populates="actor")


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        SqlEnum(RequestStatus, name="request_status"), default=RequestStatus.DRAFT, nullable=False
    )
    # created_by -> users.id: the requester/owner who submitted this request.
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # "metadata" is the database column name; metadata_ avoids SQLAlchemy's reserved Base.metadata attribute.
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    creator: Mapped[User] = relationship(back_populates="created_requests")
    approval_steps: Mapped[list[ApprovalStep]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="ApprovalStep.step_order"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(back_populates="request", cascade="all, delete-orphan")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    # request_id -> requests.id: this step belongs to one approval request.
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), nullable=False, index=True)
    # approver_id -> users.id: the user responsible for deciding this step.
    approver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    decision: Mapped[StepDecision] = mapped_column(
        SqlEnum(StepDecision, name="step_decision"), default=StepDecision.PENDING, nullable=False
    )
    decision_notes: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    request: Mapped[Request] = relationship(back_populates="approval_steps")
    approver: Mapped[User] = relationship(back_populates="assigned_steps")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    # request_id -> requests.id: the request whose lifecycle event was recorded.
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), nullable=False, index=True)
    # actor_id -> users.id: the user (or service user) that performed the action.
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    request: Mapped[Request] = relationship(back_populates="audit_logs")
    actor: Mapped[User] = relationship(back_populates="audit_events")
