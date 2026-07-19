# ============================================================
# bot/handlers/categories.py
# /categories command + inline keyboard CRUD for categories.
#
# /categories → main menu (Add / Edit / Delete)
#   Add    → FSM: CategoryAdd.waiting_for_name   → type name → INSERT
#   Delete → show [X] list → click → DELETE (cascade)
#   Edit   → show list → click → FSM: CategoryEdit.waiting_for_new_name → UPDATE
# ============================================================

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.filters import Command, StateFilter

from bot.states import CategoryAdd, CategoryEdit
from bot.keyboards import (
    category_manage_keyboard,
    category_delete_keyboard,
    category_edit_keyboard,
)
from bot import database as db

router = Router(name="categories")


# ─── /categories command ──────────────────────────────────────────────────────

@router.message(Command("categories"))
async def cmd_categories(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
        reply_markup=category_manage_keyboard(),
        parse_mode="HTML",
    )


# ─── Main menu callbacks ──────────────────────────────────────────────────────

@router.callback_query(F.data == "cat_action:back")
async def back_to_menu(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.message.edit_text(
        "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
        reply_markup=category_manage_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer()


# ─── ADD ──────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "cat_action:add")
async def cat_add_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(CategoryAdd.waiting_for_name)
    await callback.message.edit_text(
        "➕ <b>Yangi kategoriya nomi</b>\n\nKategoriya nomini kiriting:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(StateFilter(CategoryAdd.waiting_for_name), F.text)
async def cat_add_save(message: Message, state: FSMContext) -> None:
    name = message.text.strip()

    try:
        record = await db.add_category(name)
        await state.clear()
        await message.answer(
            f"✅ <b>Kategoriya qo'shildi!</b>\n"
            f"🆔 ID: <code>{record['id']}</code>\n"
            f"📂 Nomi: {record['name']}",
            reply_markup=category_manage_keyboard(),
            parse_mode="HTML",
        )
    except Exception as exc:
        # Unique constraint violation — name already exists
        if "unique" in str(exc).lower():
            await message.answer(
                f"⚠️ <b>'{name}'</b> kategoriyasi allaqachon mavjud.\n"
                "Boshqa nom kiriting:",
                parse_mode="HTML",
            )
        else:
            await state.clear()
            await message.answer(f"❌ Xatolik yuz berdi: {exc}")


# ─── DELETE ───────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "cat_action:delete")
async def cat_delete_list(callback: CallbackQuery, state: FSMContext) -> None:
    categories = await db.get_all_categories()

    if not categories:
        await callback.answer("Hech qanday kategoriya yo'q.", show_alert=True)
        return

    await callback.message.edit_text(
        "🗑 <b>O'chirish uchun kategoriyani tanlang:</b>\n"
        "<i>(Kategoriyani o'chirish u bilan bog'liq barcha kitoblarni ham o'chiradi)</i>",
        reply_markup=category_delete_keyboard(categories),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data.startswith("cat_delete:"))
async def cat_delete_confirm(callback: CallbackQuery, state: FSMContext) -> None:
    category_id = int(callback.data.split(":")[1])
    record = await db.delete_category(category_id)

    if not record:
        await callback.answer("Kategoriya topilmadi.", show_alert=True)
        return

    # Refresh the list
    remaining = await db.get_all_categories()

    if remaining:
        await callback.message.edit_text(
            f"✅ <b>'{record['name']}'</b> kategoriyasi o'chirildi.\n\n"
            "🗑 Boshqa kategoriyani ham o'chirmoqchimisiz?",
            reply_markup=category_delete_keyboard(remaining),
            parse_mode="HTML",
        )
    else:
        await callback.message.edit_text(
            f"✅ <b>'{record['name']}'</b> kategoriyasi o'chirildi.\n"
            "Barcha kategoriyalar o'chirildi.",
            reply_markup=category_manage_keyboard(),
            parse_mode="HTML",
        )
    await callback.answer(f"'{record['name']}' o'chirildi.")


# ─── EDIT ─────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "cat_action:edit")
async def cat_edit_list(callback: CallbackQuery, state: FSMContext) -> None:
    categories = await db.get_all_categories()

    if not categories:
        await callback.answer("Hech qanday kategoriya yo'q.", show_alert=True)
        return

    await callback.message.edit_text(
        "✏️ <b>Tahrirlash uchun kategoriyani tanlang:</b>",
        reply_markup=category_edit_keyboard(categories),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data.startswith("cat_edit:"))
async def cat_edit_select(callback: CallbackQuery, state: FSMContext) -> None:
    category_id = int(callback.data.split(":")[1])
    category = await db.get_category_by_id(category_id)

    if not category:
        await callback.answer("Kategoriya topilmadi.", show_alert=True)
        return

    await state.set_state(CategoryEdit.waiting_for_new_name)
    await state.update_data(editing_category_id=category_id, old_name=category["name"])

    await callback.message.edit_text(
        f"✏️ <b>'{category['name']}'</b> uchun yangi nom kiriting:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(StateFilter(CategoryEdit.waiting_for_new_name), F.text)
async def cat_edit_save(message: Message, state: FSMContext) -> None:
    new_name = message.text.strip()
    data = await state.get_data()
    category_id = data["editing_category_id"]
    old_name    = data["old_name"]

    try:
        record = await db.edit_category(category_id, new_name)
        await state.clear()
        await message.answer(
            f"✅ <b>Kategoriya yangilandi!</b>\n"
            f"📂 Eski nom: {old_name}\n"
            f"📂 Yangi nom: {record['name']}",
            reply_markup=category_manage_keyboard(),
            parse_mode="HTML",
        )
    except Exception as exc:
        if "unique" in str(exc).lower():
            await message.answer(
                f"⚠️ <b>'{new_name}'</b> nomi allaqachon mavjud.\n"
                "Boshqa nom kiriting:",
                parse_mode="HTML",
            )
        else:
            await state.clear()
            await message.answer(f"❌ Xatolik yuz berdi: {exc}")
