# ============================================================
# bot/config.py
# All secrets are loaded from environment variables / .env file.
# Never hard-code tokens or connection strings.
# ============================================================

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # Telegram
    BOT_TOKEN: str
    STORAGE_CHANNEL_ID: str

    # Neon PostgreSQL
    DATABASE_URL: str

    # Optional proxy for restricted networks (socks5://host:port or http://host:port)
    PROXY_URL: Optional[str] = None

    # Comma-separated Telegram user IDs — leave empty to allow all
    ADMIN_IDS_RAW: Optional[str] = ""

    @property
    def ADMIN_IDS(self) -> list[int]:
        if not self.ADMIN_IDS_RAW:
            return []
        return [int(x.strip()) for x in self.ADMIN_IDS_RAW.split(",") if x.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()  # type: ignore[call-arg]
