import { Markup } from 'telegraf';

export function buildPersistentKeyboard() {
  return Markup.keyboard([
    ["📚 Barcha kitoblar (PDF)", "📊 CSV faylda yuklash"],
    ["📂 Kategoriyalar", "📥 Kitob yuklash (Bitta)"],
    ["📦 Komplekt kitoblar yuklash", "✏️ Kitobni tahrirlash"],
    ["🗑 Kitobni o'chirish", "📌 Chat ID (Ma'lumot)"]
  ]).resize();
}

export function buildCategoriesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📂 Kategoriyalardagi kitoblar", 'cat_action:browse')],
    [Markup.button.callback("➕ Yangi kategoriya qo'shish", 'cat_action:add')],
    [Markup.button.callback("✏️ Kategoriya tahrirlash", 'cat_action:edit')],
    [Markup.button.callback("🗑 Kategoriya o'chirish", 'cat_action:delete')],
    [Markup.button.callback("✏️ Kitobni tahrirlash", 'edit_book_menu')],
    [Markup.button.callback("🗑 Kitobni bazadan o'chirish", 'del_book_menu')]
  ]);
}
