# ============================================================
# bot/states.py
# FSM state groups for aiogram v3.
# ============================================================

from aiogram.fsm.state import State, StatesGroup


class BookUpload(StatesGroup):
    """State machine for uploading a new book."""
    waiting_for_category = State()   # Admin sent a file → bot shows category keyboard
    waiting_for_name     = State()   # Admin selected category → bot asks for book name


class CategoryAdd(StatesGroup):
    """State machine for adding a new category."""
    waiting_for_name = State()


class CategoryEdit(StatesGroup):
    """State machine for editing an existing category name."""
    waiting_for_category = State()   # Admin clicked Edit → bot shows category list
    waiting_for_new_name = State()   # Admin selected category → bot asks for new name
