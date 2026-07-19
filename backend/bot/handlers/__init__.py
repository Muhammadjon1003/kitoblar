"""
bot/handlers/__init__.py
Expose a single list of routers so main.py can include them all cleanly.
"""
from bot.handlers.books import router as books_router
from bot.handlers.categories import router as categories_router

all_routers = [categories_router, books_router]
