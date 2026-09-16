"""FastAPI dependencies that connect a Clerk identity to a local user."""

from collections.abc import Mapping

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_clerk_client, require_clerk_user_id
from database import get_db
from models import ApplicationRole, User, UserRole


CLERK_ROLE_MAP: dict[str, tuple[ApplicationRole, UserRole]] = {
    "requester": (ApplicationRole.REQUESTER, UserRole.REQUESTER),
    "manager": (ApplicationRole.MANAGER, UserRole.APPROVER),
    "finance": (ApplicationRole.FINANCE, UserRole.APPROVER),
    "procurement": (ApplicationRole.PROCUREMENT, UserRole.APPROVER),
    "admin": (ApplicationRole.ADMIN, UserRole.ADMIN),
}


def _profile_email(clerk_user: object) -> str | None:
    """Read the primary email from Clerk's user object."""
    primary_email_id = getattr(clerk_user, "primary_email_address_id", None)
    for email_address in getattr(clerk_user, "email_addresses", []) or []:
        if getattr(email_address, "id", None) == primary_email_id:
            return getattr(email_address, "email_address", None)
    return None


def _profile_name(clerk_user: object, email: str) -> str:
    """Build the required local display name from Clerk profile fields."""
    name = " ".join(
        part.strip()
        for part in (getattr(clerk_user, "first_name", None), getattr(clerk_user, "last_name", None))
        if isinstance(part, str) and part.strip()
    )
    if name:
        return name[:255]

    username = getattr(clerk_user, "username", None)
    if isinstance(username, str) and username.strip():
        return username.strip()[:255]
    return email.split("@", maxsplit=1)[0][:255]


def _clerk_application_role(clerk_user: object) -> str | None:
    """Read the same application-role metadata used by the Next.js app."""
    # unsafe_metadata is user-editable in Clerk and must never grant workflow
    # authority. Administrators set public/private metadata instead.
    for attribute in ("public_metadata", "private_metadata"):
        metadata = getattr(clerk_user, attribute, None)
        if isinstance(metadata, Mapping):
            role = metadata.get("role")
            if isinstance(role, str) and role.strip().lower() in CLERK_ROLE_MAP:
                return role.strip().lower()
    return None


def _get_clerk_profile(clerk_user_id: str) -> tuple[str, str, str]:
    """Fetch the Clerk profile and its authorized application role."""
    try:
        clerk_user = get_clerk_client().users.get(user_id=clerk_user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve the Clerk user profile.",
        ) from exc

    email = _profile_email(clerk_user)
    if not isinstance(email, str) or not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A Clerk primary email address is required to create a local user.",
        )
    application_role = _clerk_application_role(clerk_user)
    if application_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A valid application role is required to access the workflow.",
        )
    return _profile_name(clerk_user, email), email, application_role


def get_current_user(
    clerk_user_id: str = Depends(require_clerk_user_id), db: Session = Depends(get_db)
) -> User:
    """Return the authenticated local user, creating or linking one on first login."""
    name, email, clerk_role = _get_clerk_profile(clerk_user_id)
    application_role, postgres_role = CLERK_ROLE_MAP[clerk_role]

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user:
        # Clerk metadata is the source of truth for the local role. Keep the
        # stable local ID so existing requests and audit history remain linked.
        user.name = name
        user.role = postgres_role
        user.application_role = application_role.value
        if user.email != email:
            email_owner = db.query(User).filter(User.email == email, User.id != user.id).first()
            if email_owner is None:
                user.email = email
        db.commit()
        db.refresh(user)
        return user

    # Preserve a Day 1 user's role and history when its verified Clerk email
    # matches a legacy local account that has not yet been linked.
    legacy_user = db.query(User).filter(User.email == email).first()
    if legacy_user:
        if legacy_user.clerk_user_id and legacy_user.clerk_user_id != clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already linked to another Clerk user.",
            )
        legacy_user.clerk_user_id = clerk_user_id
        legacy_user.name = name
        legacy_user.role = postgres_role
        legacy_user.application_role = application_role.value
        db.commit()
        db.refresh(legacy_user)
        return legacy_user

    user = User(
        clerk_user_id=clerk_user_id,
        name=name,
        email=email,
        role=postgres_role,
        application_role=application_role.value,
    )
    db.add(user)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create the local user record.",
        ) from exc
    db.refresh(user)
    return user
