"""Database engine and per-request SQLAlchemy session setup."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# Load the backend-local .env file without overriding environment values supplied
# by Docker, a deployment platform, or the shell.
load_dotenv(Path(__file__).with_name(".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in .env or the environment.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Base class inherited by every ORM model."""


def get_db():
    """FastAPI dependency that yields one database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
