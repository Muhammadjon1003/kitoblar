# ============================================================
# bot/main.py — Entry point for the Telegram bot process.
# ============================================================

import asyncio
import logging
import sys

# ── Windows fix ───────────────────────────────────────────────────────────────
# aiohttp has known issues with Windows ProactorEventLoop + SSL (WinError 64).
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
# ─────────────────────────────────────────────────────────────────────────────

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import settings
from bot.database import get_pool, close_pool
from bot.handlers import all_routers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    logger.info("Connecting to Neon PostgreSQL …")
    await get_pool()
    logger.info("DB pool ready.")

    # ── Build session (with optional proxy) ───────────────────────────────────
    if settings.PROXY_URL:
        logger.info(f"Using proxy: {settings.PROXY_URL}")
        try:
            from aiohttp_socks import ProxyConnector
            connector = ProxyConnector.from_url(settings.PROXY_URL)
            session = AiohttpSession(connector=connector)
        except ImportError:
            logger.warning(
                "aiohttp-socks not installed — falling back to HTTP proxy via env vars.\n"
                "Install it with: pip install aiohttp-socks"
            )
            session = AiohttpSession(proxy=settings.PROXY_URL)
    else:
        session = AiohttpSession()

    bot = Bot(
        token=settings.BOT_TOKEN,
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher(storage=MemoryStorage())

    for router in all_routers:
        dp.include_router(router)

    logger.info("Starting polling …")
    try:
        # Clear any active webhooks (like the one set by Vercel)
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await close_pool()
        await bot.session.close()
        logger.info("Bot stopped cleanly.")


if __name__ == "__main__":
    asyncio.run(main())
