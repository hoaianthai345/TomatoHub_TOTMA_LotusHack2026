from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "LotusHack Backend"
    APP_ENV: str = "local"
    SECRET_KEY: str = "change-me"
    API_V1_PREFIX: str = "/api/v1"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    BACKEND_CORS_ALLOW_ORIGIN_REGEX: str = (
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    )
    UPLOAD_DIR: str = "uploads"
    UPLOAD_URL_PREFIX: str = "/uploads"
    CAMPAIGN_IMAGE_MAX_SIZE_MB: int = 10

    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/lotushack"
    )

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    def upload_root_path(self) -> Path:
        upload_path = Path(self.UPLOAD_DIR)
        if not upload_path.is_absolute():
            upload_path = BASE_DIR / upload_path
        return upload_path.resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
