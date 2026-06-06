import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator


load_dotenv()


class Settings(BaseModel):
    database_url: str = Field(..., min_length=1)
    openai_api_key: str = Field(..., min_length=1)
    redis_url: str = Field(default="redis://localhost:6379/0", min_length=1)
    imap_host: str = Field(default="", min_length=0)
    imap_user: str = Field(default="", min_length=0)
    imap_password: str = Field(default="", min_length=0)
    app_name: str = "AutoReach AI API"
    environment: str = "development"
    scheduler_timezone: str = "UTC"
    openai_model: str = "gpt-4o-mini"
    stale_after_days: int = 7

    @field_validator("database_url")
    @classmethod
    def validate_async_mysql_url(cls, value: str) -> str:
        if not value.startswith("mysql+"):
            raise ValueError("DATABASE_URL must use an async MySQL driver, for example mysql+aiomysql://")
        return value

    @classmethod
    def from_env(cls) -> "Settings":
        try:
            return cls(
                database_url=os.environ.get("DATABASE_URL", ""),
                openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
                redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
                imap_host=os.environ.get("IMAP_HOST", ""),
                imap_user=os.environ.get("IMAP_USER", ""),
                imap_password=os.environ.get("IMAP_PASSWORD", ""),
                app_name=os.environ.get("APP_NAME", "AutoReach AI API"),
                environment=os.environ.get("ENVIRONMENT", "development"),
                scheduler_timezone=os.environ.get("SCHEDULER_TIMEZONE", "UTC"),
                openai_model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                stale_after_days=int(os.environ.get("STALE_AFTER_DAYS", "7")),
            )
        except ValidationError:
            raise


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
