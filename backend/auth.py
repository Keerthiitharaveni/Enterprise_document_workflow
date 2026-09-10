"""Clerk session-token verification helpers for FastAPI requests."""

import os

from fastapi import HTTPException, Request, status
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions


def _authorized_parties() -> list[str]:
    """Return the configured frontend origins, ignoring empty values."""
    configured_origins = os.getenv("CLERK_AUTHORIZED_PARTIES", "http://localhost:3000")
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


def get_clerk_client() -> Clerk:
    """Create a Clerk Backend API client without exposing its secret key."""
    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("CLERK_SECRET_KEY must be set in .env or the environment.")
    return Clerk(bearer_auth=secret_key)


def _require_publishable_key() -> str:
    """Require the Clerk instance publishable key used by this application."""
    publishable_key = os.getenv("CLERK_PUBLISHABLE_KEY")
    if not publishable_key:
        raise RuntimeError("CLERK_PUBLISHABLE_KEY must be set in .env or the environment.")
    return publishable_key


def require_clerk_user_id(request: Request) -> str:
    """Verify a Clerk session token and return its authenticated user ID."""
    # The current Python SDK uses CLERK_SECRET_KEY to retrieve/cache JWKS when
    # jwt_key is omitted. It does not expose a publishable_key option on its
    # AuthenticateRequestOptions, so we validate that required Clerk setting
    # here without passing an unsupported SDK argument.
    _require_publishable_key()
    request_state = get_clerk_client().authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=os.getenv("CLERK_SECRET_KEY"),
            authorized_parties=_authorized_parties(),
            accepts_token=["session_token"],
        ),
    )

    if not request_state.is_signed_in or not request_state.payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Clerk session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clerk_user_id = request_state.payload.get("sub")
    if not isinstance(clerk_user_id, str) or not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clerk session token does not identify a user.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return clerk_user_id
