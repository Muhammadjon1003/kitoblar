-- ============================================================
-- SmartBook — Neon PostgreSQL Migration
-- File: migrations/001_init.sql
-- Run once against your Neon database to bootstrap the schema.
-- ============================================================

-- Categories lookup table
CREATE TABLE IF NOT EXISTS categories (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Books table — tg_file_id is the Telegram Cloud CDN reference.
-- No binary data is stored here; only the opaque file-id string.
CREATE TABLE IF NOT EXISTS books (
    id            SERIAL       PRIMARY KEY,
    tg_file_id    VARCHAR(255) NOT NULL,
    tg_message_id INT          NOT NULL,          -- message id in the storage channel
    name          VARCHAR(255) NOT NULL,
    category_id   INT          NOT NULL
        REFERENCES categories(id) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_tg_file  ON books(tg_file_id);

-- Seed a default category so the bot is immediately usable
INSERT INTO categories (name)
VALUES ('Umumiy')
ON CONFLICT (name) DO NOTHING;
