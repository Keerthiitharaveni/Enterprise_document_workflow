"""FastAPI dependencies that connect a Clerk identity to a local user."""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_clerk_client, require_clerk_user_id
from database import get_db
from models import User, UserRole


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


def _get_clerk_profile(clerk_user_id: str) -> tuple[str, str]:
    """Fetch only the name and primary email needed by the existing User model."""
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
    return _profile_name(clerk_user, email), email


def get_current_user(
    clerk_user_id: str = Depends(require_clerk_user_id), db: Session = Depends(get_db)
) -> User:
    """Return the authenticated local user, creating or linking one on first login."""
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user:
        return user

    name, email = _get_clerk_profile(clerk_user_id)

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
        db.commit()
        db.refresh(legacy_user)
        return legacy_user

    user = User(
        clerk_user_id=clerk_user_id,
        name=name,
        email=email,
        role=UserRole.REQUESTER,
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
