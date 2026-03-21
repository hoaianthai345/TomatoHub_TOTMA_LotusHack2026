import json
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "LotusHack Backend"
    APP_ENV: str = "local"
    SECRET_KEY: str = "change-me"
    API_V1_PREFIX: str = "/api/v1"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_DEBUG_RETURN_TOKEN: bool = False
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    BACKEND_CORS_ALLOW_ORIGIN_REGEX: str = (
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    )
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "uploads"
    UPLOAD_URL_PREFIX: str = "/uploads"
    CAMPAIGN_IMAGE_MAX_SIZE_MB: int = 10
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str | None = None
    S3_KEY_PREFIX: str = ""
    S3_PUBLIC_BASE_URL: str | None = None
    S3_FORCE_PATH_STYLE: bool = True
    RECOMMENDATION_USE_LLM: bool = True
    GROQ_API_KEY: str | None = None
    GROQ_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_HEAVY: str = ""
    GROQ_MODEL_LIGHT: str = "llama-3.1-8b-instant"
    GROQ_TIMEOUT_SECONDS: int = 20
    SUPPORTER_RECOMMENDATION_MAX_LIMIT: int = 20
    RECOMMENDATION_MODEL_ROUTING_ENABLED: bool = True
    RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD: int = 900
    RECOMMENDATION_SUPPORTER_LIGHT_MAX_ITEMS: int = 8
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT_SECONDS: int = 15
    DB_POOL_RECYCLE_SECONDS: int = 300
    DB_CONNECT_TIMEOUT_SECONDS: int = 10
    DB_STATEMENT_TIMEOUT_MS: int = 15000
    DB_RETRY_MAX_ATTEMPTS: int = 2
    DB_RETRY_BASE_DELAY_MS: int = 200
    DB_RETRY_MAX_DELAY_MS: int = 1200
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_LOGIN_RATE_LIMIT_PER_IP: int = 25
    AUTH_LOGIN_RATE_LIMIT_PER_EMAIL: int = 8
    AUTH_SIGNUP_RATE_LIMIT_PER_IP: int = 12
    AUTH_REFRESH_RATE_LIMIT_PER_IP: int = 60
    AUTH_FORGOT_PASSWORD_RATE_LIMIT_PER_IP: int = 20

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
        raw = self.BACKEND_CORS_ORIGINS.strip()
        if not raw:
            return []

        values: list[str]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                values = [str(item) for item in parsed]
            else:
                values = raw.split(",")
        else:
            values = raw.split(",")

        normalized: list[str] = []
        for value in values:
            clean = str(value).strip().strip('"').strip("'").rstrip("/")
            if clean and clean not in normalized:
                normalized.append(clean)
        return normalized

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = f"postgresql://{url[len('postgres://'):]}"
        if url.startswith("postgresql://"):
            url = f"postgresql+psycopg2://{url[len('postgresql://'):]}"

        parts = urlsplit(url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        host = (parts.hostname or "").lower()
        cloud_domains = ("supabase.com", "aivencloud.com", "render.com")
        if any(host.endswith(domain) for domain in cloud_domains) and "sslmode" not in query:
            query["sslmode"] = "require"

        return urlunsplit(
            (
                parts.scheme,
                parts.netloc,
                parts.path,
                urlencode(query, doseq=True),
                parts.fragment,
            )
        )

    def upload_root_path(self) -> Path:
        upload_path = Path(self.UPLOAD_DIR)
        if not upload_path.is_absolute():
            upload_path = BASE_DIR / upload_path
        return upload_path.resolve()

    def is_s3_storage(self) -> bool:
        return self.STORAGE_BACKEND.strip().lower() == "s3"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
