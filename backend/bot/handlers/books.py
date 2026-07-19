# ============================================================
# bot/handlers/books.py
# FSM handlers for the book upload workflow.
#
# Flow:
#   Admin sends document
#     → FSM: BookUpload.waiting_for_category
#     → Bot shows category keyboard
#   Admin clicks a category button
#     → FSM: BookUpload.waiting_for_name
#     → Bot asks: "Kitob nomi?"
#   Admin types a name
#     → Bot forwards file to STORAGE_CHANNEL with caption
#     → Bot saves record to DB
#     → Bot confirms success
# ============================================================

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, Document
from aiogram.fsm.context import FSMContext
from aiogram.filters import StateFilter

from bot.config import settings
from bot.states import BookUpload
from bot.keyboards import category_select_keyboard
from bot import database as db

router = Router(name="books")

# ─── Middleware: admin guard ──────────────────────────────────────────────────

def _is_admin(user_id: int) -> bool:
    """Allow all users if ADMIN_IDS is not configured, else restrict."""
    if not settings.ADMIN_IDS:
        return True
    return user_id in settings.ADMIN_IDS


# ─── Step 1: Admin sends a document ──────────────────────────────────────────

@router.message(F.document)
async def handle_document(message: Message, state: FSMContext) -> None:
    if not _is_admin(message.from_user.id):
        return

    categories = await db.get_all_categories()

    if not categories:
        await message.answer(
            "⚠️ Hech qanday kategoriya topilmadi.\n"
            "Avval /categories buyrug'i orqali kategoriya qo'shing."
        )
        return

    # Persist the file_id so we can use it after multiple FSM steps
    await state.update_data(
        tg_file_id=message.document.file_id,
        original_message_id=message.message_id,
    )
    await state.set_state(BookUpload.waiting_for_category)

    await message.answer(
        "📂 <b>Kategoriyani tanlang:</b>",
        reply_markup=category_select_keyboard(categories),
        parse_mode="HTML",
    )


# ─── Step 2: Admin selects a category ────────────────────────────────────────

@router.callback_query(
    StateFilter(BookUpload.waiting_for_category),
    F.data.startswith("book_cat:"),
)
async def handle_category_selected(callback: CallbackQuery, state: FSMContext) -> None:
    category_id = int(callback.data.split(":")[1])
    category = await db.get_category_by_id(category_id)

    if not category:
        await callback.answer("Kategoriya topilmadi, qayta urinib ko'ring.", show_alert=True)
        return

    await state.update_data(category_id=category_id, category_name=category["name"])
    await state.set_state(BookUpload.waiting_for_name)

    await callback.message.edit_text(
        f"✅ Kategoriya: <b>{category['name']}</b>\n\n"
        f"📝 Endi kitob nomini kiriting:",
        parse_mode="HTML",
    )
    await callback.answer()


# ─── Step 3: Admin types the book name ───────────────────────────────────────

@router.message(StateFilter(BookUpload.waiting_for_name), F.text)
async def handle_book_name(message: Message, state: FSMContext, bot: Bot) -> None:
    book_name = message.text.strip()
    data = await state.get_data()

    tg_file_id    = data["tg_file_id"]
    category_id   = data["category_id"]
    category_name = data["category_name"]

    # ── Forward to storage channel ──────────────────────────────────────────
    # We send a placeholder first so we can include the DB id in the caption.
    # Strategy: insert DB record first (without message_id), get the id,
    # then forward with the caption, then update the row with message_id.

    # Insert without message_id placeholder (use 0 temporarily)
    book_record = await db.add_book(
        tg_file_id=tg_file_id,
        tg_message_id=0,
        name=book_name,
        category_id=category_id,
    )
    book_id = book_record["id"]

    # Build the required caption format
    caption = (
        f"ID: {book_id}\n"
        f"Name: {book_name}\n"
        f"Subject: {category_name}"
    )

    # Send to the storage channel
    channel_msg = await bot.send_document(
        chat_id=settings.STORAGE_CHANNEL_ID,
        document=tg_file_id,
        caption=caption,
    )

    # Update the database row with the real message_id
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE books SET tg_message_id = $1 WHERE id = $2",
            channel_msg.message_id,
            book_id,
        )

    await state.clear()

    await message.answer(
        f"✅ <b>Kitob muvaffaqiyatli saqlandi!</b>\n\n"
        f"🆔 ID: <code>{book_id}</code>\n"
        f"📖 Nomi: {book_name}\n"
        f"📂 Kategoriya: {category_name}",
        parse_mode="HTML",
    )
