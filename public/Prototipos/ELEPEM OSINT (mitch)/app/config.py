from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Alerta Mayor"
    app_host: str = "127.0.0.1"
    app_port: int = Field(default=8000, ge=1, le=65535)
    database_url: str = "postgresql+psycopg://elepem:change-me@db:5432/elepem"
    brave_search_api_key: str | None = None
    google_places_api_key: str | None = None
    http_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
