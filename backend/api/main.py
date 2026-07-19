# ============================================================
# api/main.py
# FastAPI web service — exposes the order delivery endpoint.
#
# POST /orders/deliver
#   Body: { book_id, supplier_chat_id, supplier_thread_id?,
#           customer_name, order_notes? }
#   1. Looks up tg_file_id from Neon by book_id
#   2. Calls Telegram sendDocument with that file_id
#   3. Returns success or error
# ============================================================

from __future__ import annotations

import os
import asyncpg
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from api.telegram import TelegramSender

# ─── Settings (simple os.getenv — no pydantic-settings dep in API layer) ──────

BOT_TOKEN    = os.environ["BOT_TOKEN"]
DATABASE_URL = os.environ["DATABASE_URL"]

_pool: Optional[asyncpg.Pool] = None
_tg   = TelegramSender(BOT_TOKEN)


# ─── Lifespan: open/close DB pool ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    yield
    if _pool:
        await _pool.close()


app = FastAPI(
    title="SmartBook Delivery API",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Request / Response models ────────────────────────────────────────────────

class DeliverOrderRequest(BaseModel):
    book_id:            int         = Field(..., description="Primary key from books table")
    supplier_chat_id:   str         = Field(..., description="Supplier's Telegram chat_id or username")
    supplier_thread_id: Optional[int] = Field(None, description="Forum topic thread id (optional)")
    customer_name:      str         = Field(..., description="Customer's full name")
    order_notes:        Optional[str] = Field(None, description="Additional order details")


class DeliverOrderResponse(BaseModel):
    success:        bool
    telegram_message_id: Optional[int] = None
    book_name:      Optional[str]  = None
    detail:         Optional[str]  = None


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@app.post(
    "/orders/deliver",
    response_model=DeliverOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a book file to a supplier via Telegram",
)
async def deliver_order(body: DeliverOrderRequest) -> DeliverOrderResponse:
    """
    Workflow:
    1. SELECT tg_file_id, name FROM books WHERE id = book_id
    2. Build caption with customer info
    3. Call Telegram Bot API sendDocument
    4. Return Telegram message_id as confirmation
    """
    # ── 1. Fetch book from database ──────────────────────────────────────────
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT b.tg_file_id, b.name AS book_name, c.name AS category_name
            FROM   books b
            JOIN   categories c ON c.id = b.category_id
            WHERE  b.id = $1
            """,
            body.book_id,
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id={body.book_id} not found.",
        )

    # ── 2. Build Telegram caption ────────────────────────────────────────────
    caption_lines = [
        f"📦 <b>Yangi buyurtma</b>",
        f"",
        f"📖 <b>Kitob:</b> {row['book_name']}",
        f"📂 <b>Kategoriya:</b> {row['category_name']}",
        f"👤 <b>Mijoz:</b> {body.customer_name}",
    ]
    if body.order_notes:
        caption_lines.append(f"📝 <b>Izoh:</b> {body.order_notes}")

    caption = "\n".join(caption_lines)

    # ── 3. Send via Telegram ─────────────────────────────────────────────────
    try:
        tg_response = await _tg.send_document(
            chat_id=body.supplier_chat_id,
            file_id=row["tg_file_id"],
            caption=caption,
            message_thread_id=body.supplier_thread_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram API error: {exc}",
        )

    tg_message_id = tg_response.get("result", {}).get("message_id")

    return DeliverOrderResponse(
        success=True,
        telegram_message_id=tg_message_id,
        book_name=row["book_name"],
        detail="Kitob ta'minotchiga muvaffaqiyatli yuborildi.",
    )


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {"status": "ok"}
