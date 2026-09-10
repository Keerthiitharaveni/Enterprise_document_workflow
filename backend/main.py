"""FastAPI application entry point."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Keep this explicit here so the application entry point works independently.
load_dotenv(Path(__file__).with_name(".env"))

from database import Base, engine  # noqa: E402
import models  # noqa: F401, E402  # Register ORM models on Base.metadata before create_all.


app = FastAPI(title="Enterprise Approval Workflow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_database_tables() -> None:
    """Create missing ORM tables when the API starts."""
    Base.metadata.create_all(bind=engine)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
