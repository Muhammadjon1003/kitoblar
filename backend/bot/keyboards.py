# ============================================================
# bot/keyboards.py
# All inline keyboard builder functions — pure functions,
# no database calls inside. Pass data in, get keyboard out.
# ============================================================

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from asyncpg import Record


def category_select_keyboard(categories: list[Record]) -> InlineKeyboardMarkup:
    """
    Shown after admin uploads a file.
    Each button triggers callback_data = "book_cat:{category_id}"
    """
    builder = InlineKeyboardBuilder()
    for cat in categories:
        builder.button(
            text=cat["name"],
            callback_data=f"book_cat:{cat['id']}",
        )
    builder.adjust(2)
    return builder.as_markup()


def category_manage_keyboard() -> InlineKeyboardMarkup:
    """
    Main menu shown by /categories command.
    Three actions: Add, Edit, Delete.
    """
    builder = InlineKeyboardBuilder()
    builder.button(text="➕  Kategoriya qo'shish",  callback_data="cat_action:add")
    builder.button(text="✏️  Kategoriya tahrirlash", callback_data="cat_action:edit")
    builder.button(text="🗑  Kategoriya o'chirish",  callback_data="cat_action:delete")
    builder.adjust(1)
    return builder.as_markup()


def category_delete_keyboard(categories: list[Record]) -> InlineKeyboardMarkup:
    """
    Delete view: each category gets its own button with [X] prefix.
    callback_data = "cat_delete:{category_id}"
    """
    builder = InlineKeyboardBuilder()
    for cat in categories:
        builder.button(
            text=f"[X]  {cat['name']}",
            callback_data=f"cat_delete:{cat['id']}",
        )
    builder.button(text="⬅️  Orqaga", callback_data="cat_action:back")
    builder.adjust(1)
    return builder.as_markup()


def category_edit_keyboard(categories: list[Record]) -> InlineKeyboardMarkup:
    """
    Edit view: select which category to rename.
    callback_data = "cat_edit:{category_id}"
    """
    builder = InlineKeyboardBuilder()
    for cat in categories:
        builder.button(
            text=cat["name"],
            callback_data=f"cat_edit:{cat['id']}",
        )
    builder.button(text="⬅️  Orqaga", callback_data="cat_action:back")
    builder.adjust(2)
    return builder.as_markup()
