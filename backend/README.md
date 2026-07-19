# SmartBook — Backend System

Telegram bot + FastAPI service for digital book storage and delivery.

## Directory Structure

```
backend/
├── migrations/
│   └── 001_init.sql        # Run once to create tables in Neon
├── bot/
│   ├── config.py           # Pydantic settings (reads .env)
│   ├── database.py         # asyncpg pool + all DB queries
│   ├── states.py           # aiogram FSM state groups
│   ├── keyboards.py        # Inline keyboard builders
│   ├── main.py             # Bot entry point (polling)
│   └── handlers/
│       ├── books.py        # Book upload FSM (3-step flow)
│       └── categories.py   # /categories CRUD command
├── api/
│   ├── main.py             # FastAPI: POST /orders/deliver
│   └── telegram.py         # httpx wrapper for sendDocument
├── requirements.txt
└── .env.example
```

## Setup

### 1. Neon Database

```bash
# Install psql if you don't have it, then:
psql $DATABASE_URL -f migrations/001_init.sql
```

### 2. Environment

```bash
cp .env.example .env
# Fill in BOT_TOKEN, STORAGE_CHANNEL_ID, DATABASE_URL, ADMIN_IDS
```

### 3. Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run the bot

```bash
python -m bot.main
```

### 5. Run the API

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Bot Commands

| Command       | Description                            |
|---------------|----------------------------------------|
| `/categories` | Open category management menu          |
| Send any file | Trigger book upload workflow           |

---

## API Endpoint

### `POST /orders/deliver`

Sends a book file directly to a supplier's Telegram chat.

**Request body:**
```json
{
  "book_id": 42,
  "supplier_chat_id": "-1001234567890",
  "supplier_thread_id": 15,
  "customer_name": "Jasur Toshmatov",
  "order_notes": "Express delivery requested"
}
```

**Response:**
```json
{
  "success": true,
  "telegram_message_id": 987,
  "book_name": "Advanced Mathematics Vol.2",
  "detail": "Kitob ta'minotchiga muvaffaqiyatli yuborildi."
}
```

---

## Architecture Notes

- **Zero binary storage** — only `tg_file_id` strings are persisted in Neon. Telegram Cloud is the CDN.
- **Cascade deletes** — deleting a category removes all its books from the DB (the Telegram files remain in the channel).
- **Admin guard** — set `ADMIN_IDS` in `.env` to restrict bot access to specific Telegram user IDs.
- **FSM storage** — uses `MemoryStorage` by default. For multi-process/persistent state, swap to `RedisStorage` in `bot/main.py`.
