from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _engine_kwargs() -> dict:
    kwargs: dict = {
        "pool_pre_ping": True,
    }

    database_url = settings.sqlalchemy_database_url.lower()
    if not database_url.startswith("postgresql"):
        return kwargs

    kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
            "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
            "pool_use_lifo": True,
            "connect_args": {
                "connect_timeout": settings.DB_CONNECT_TIMEOUT_SECONDS,
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5,
                "options": f"-c statement_timeout={settings.DB_STATEMENT_TIMEOUT_MS}",
            },
        }
    )
    return kwargs


engine = create_engine(
    settings.sqlalchemy_database_url,
    **_engine_kwargs(),
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
