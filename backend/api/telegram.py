# ============================================================
# api/telegram.py
# Low-level helper: send a document to a Telegram user/thread
# using the Bot API directly via httpx (no aiogram dependency
# in the web API process — lighter weight).
# ============================================================

from __future__ import annotations

import httpx
from typing import Optional


class TelegramSender:
    """
    Thin async wrapper around the Telegram Bot API sendDocument endpoint.
    Uses the already-uploaded tg_file_id — no file transfer occurs.
    """

    BASE_URL = "https://api.telegram.org/bot{token}/sendDocument"

    def __init__(self, bot_token: str) -> None:
        self._token = bot_token
        self._url   = self.BASE_URL.format(token=bot_token)

    async def send_document(
        self,
        *,
        chat_id: str | int,
        file_id: str,
        caption: str,
        message_thread_id: Optional[int] = None,  # for forum/topic threads
        parse_mode: str = "HTML",
    ) -> dict:
        """
        Send an already-uploaded document (by file_id) to chat_id.
        Returns the Telegram API response dict.
        Raises httpx.HTTPStatusError on 4xx/5xx.
        """
        payload: dict = {
            "chat_id":    chat_id,
            "document":   file_id,
            "caption":    caption,
            "parse_mode": parse_mode,
        }
        if message_thread_id is not None:
            payload["message_thread_id"] = message_thread_id

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(self._url, json=payload)
            response.raise_for_status()
            return response.json()
