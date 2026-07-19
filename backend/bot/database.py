# ============================================================
# bot/database.py
# Async database layer using asyncpg + Neon serverless PostgreSQL.
# One connection pool shared across the entire bot process.
# ============================================================

from __future__ import annotations

import asyncpg
from asyncpg import Pool, Record
from typing import Optional

from bot.config import settings

_pool: Optional[Pool] = None


async def get_pool() -> Pool:
    """Return (or lazily create) the shared connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


# ─── Category queries ─────────────────────────────────────────────────────────

async def get_all_categories() -> list[Record]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch("SELECT id, name FROM categories ORDER BY name")


async def get_category_by_id(category_id: int) -> Optional[Record]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "SELECT id, name FROM categories WHERE id = $1", category_id
        )


async def add_category(name: str) -> Record:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "INSERT INTO categories (name) VALUES ($1) RETURNING id, name", name
        )


async def edit_category(category_id: int, new_name: str) -> Optional[Record]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name",
            new_name, category_id,
        )


async def delete_category(category_id: int) -> Optional[Record]:
    """Deleting a category cascades to all its books."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "DELETE FROM categories WHERE id = $1 RETURNING id, name", category_id
        )


# ─── Book queries ─────────────────────────────────────────────────────────────

async def add_book(
    tg_file_id: str,
    tg_message_id: int,
    name: str,
    category_id: int,
) -> Record:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO books (tg_file_id, tg_message_id, name, category_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name
            """,
            tg_file_id, tg_message_id, name, category_id,
        )


async def get_book_by_id(book_id: int) -> Optional[Record]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT b.id, b.tg_file_id, b.tg_message_id, b.name,
                   c.name AS category_name
            FROM   books b
            JOIN   categories c ON c.id = b.category_id
            WHERE  b.id = $1
            """,
            book_id,
        )


async def get_books_by_category(category_id: int) -> list[Record]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(
            "SELECT id, name FROM books WHERE category_id = $1 ORDER BY name",
            category_id,
        )
