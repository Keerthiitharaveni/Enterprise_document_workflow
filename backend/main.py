"""FastAPI application entry point."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Keep this explicit here so the application entry point works independently.
load_dotenv(Path(__file__).with_name(".env"))

from sqlalchemy import inspect, text  # noqa: E402

from database import Base, engine  # noqa: E402
import models  # noqa: F401, E402  # Register ORM models on Base.metadata before create_all.
from routers.ai_analysis import router as ai_analysis_router  # noqa: E402
from routers.ai_test import router as ai_test_router  # noqa: E402
from routers.requests import router as requests_router  # noqa: E402


app = FastAPI(title="Enterprise Approval Workflow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_analysis_router)
app.include_router(ai_test_router)
app.include_router(requests_router)


@app.on_event("startup")
def create_database_tables() -> None:
    """Create tables and apply the additive Day 5 application-role column."""
    Base.metadata.create_all(bind=engine)
    # create_all does not alter existing Day 1--4 tables. This nullable field
    # is deliberately additive, keeping every existing user and FK intact.
    if "application_role" not in {column["name"] for column in inspect(engine).get_columns("users")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN application_role VARCHAR(32)"))


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
