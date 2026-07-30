import { bot, STORAGE_CHANNEL_ID } from './telegram';
import { PrismaClient } from '@prisma/client';
import { Markup } from 'telegraf';

const prisma = new PrismaClient();

// ─── Session Helpers ─────────────────────────────────────────────────────────

async function getSession(userId: number) {
  let session = await prisma.session.findUnique({
    where: { userId: String(userId) },
  });
  if (!session) {
    session = await prisma.session.create({
      data: { userId: String(userId), state: 'IDLE', data: '{}' },
    });
  }
  return {
    state: session.state,
    data: JSON.parse(session.data || '{}'),
  };
}

async function setSession(userId: number, state: string, data: any) {
  await prisma.session.upsert({
    where: { userId: String(userId) },
    update: { state, data: JSON.stringify(data) },
    create: { userId: String(userId), state, data: JSON.stringify(data) },
  });
}

async function clearSession(userId: number) {
  await prisma.session.deleteMany({
    where: { userId: String(userId) },
  });
}

// ─── Keyboard Builders ────────────────────────────────────────────────────────

function buildPersistentKeyboard() {
  return Markup.keyboard([
    ["📚 Barcha kitoblar (PDF)", "📂 Kategoriyalar"],
    ["📥 Kitob yuklash (Bitta)", "📦 Komplekt kitoblar yuklash"],
    ["✏️ Kitobni tahrirlash", "🗑 Kitobni o'chirish"],
    ["📌 Chat ID (Ma'lumot)"]
  ]).resize();
}

function buildCategoriesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📂 Kategoriyalardagi kitoblar", 'cat_action:browse')],
    [Markup.button.callback("➕ Yangi kategoriya qo'shish", 'cat_action:add')],
    [Markup.button.callback("✏️ Kategoriya tahrirlash", 'cat_action:edit')],
    [Markup.button.callback("🗑 Kategoriya o'chirish", 'cat_action:delete')],
    [Markup.button.callback("✏️ Kitobni tahrirlash", 'edit_book_menu')],
    [Markup.button.callback("🗑 Kitobni bazadan o'chirish", 'del_book_menu')]
  ]);
}

// ─── Bot Handlers ────────────────────────────────────────────────────────────

export function registerBotHandlers() {
  
  // 0. /id Command to get Chat / Group ID
  bot.command('id', async (ctx) => {
    const chatId = ctx.chat.id;
    const chatTitle = ctx.chat.type !== 'private' ? (ctx.chat as any).title : 'Shaxsiy chat';
    await ctx.reply(
      `📌 <b>Chat Ma'lumotlari:</b>\n\n` +
      `<b>Nomi:</b> ${chatTitle}\n` +
      `<b>Chat / Group ID:</b> <code>${chatId}</code>`,
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  // Automatically log when bot is added to a Telegram group or channel
  bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.chat;
    const status = ctx.myChatMember.new_chat_member.status;
    if (status === 'member' || status === 'administrator') {
      console.log(`[TELEGRAM BOT] Bot yangi guruhga qo'shildi! Nomi: "${(chat as any).title}", Group ID: ${chat.id}`);
    }
  });

  // /start & /menu Commands
  bot.start(async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "👋 <b>Assalomu alaykum! SmartBook tizimiga xush kelibsiz!</b>\n\n" +
      "Ushbu bot orqali kitoblarni guruhlash, saqlash va PDF darsliklarni yuklab olishingiz mumkin.\n\n" +
      "👇 <b>Kerakli bo'limni tanlang:</b>",
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  bot.command('menu', async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "📱 <b>Asosiy Menyu</b>",
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  // List all available PDF books
  bot.command(['books', 'pdf'], async (ctx) => {
    await sendAllBooksList(ctx);
  });

  // Edit Book command
  bot.command(['editbook'], async (ctx) => {
    await sendEditBooksMenu(ctx);
  });

  // Delete Book command
  bot.command(['deletebook', 'delbook'], async (ctx) => {
    await sendDeleteBooksMenu(ctx);
  });

  // Listen to persistent keyboard button clicks
  bot.hears("📚 Barcha kitoblar (PDF)", async (ctx) => {
    await sendAllBooksList(ctx);
  });

  bot.hears("📂 Kategoriyalar", async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "📂 <b>Kategoriyalar boshqaruvi va ko'rish</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
  });

  bot.hears(["📥 Kitob yuklash (Bitta)", "📥 Kitob yuklash bo'yicha"], async (ctx) => {
    await clearSession(ctx.from.id);
    await setSession(ctx.from.id, 'SINGLE_UPLOAD_MODE', {});
    await ctx.reply(
      "📥 <b>Bitta darslik yuklash:</b>\n\n" +
      "Iltimos, PDF darslik faylini botga yuboring.",
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  bot.hears("📦 Komplekt kitoblar yuklash", async (ctx) => {
    await clearSession(ctx.from.id);
    await setSession(ctx.from.id, 'SET_UPLOAD_ACTIVE', { files: [] });
    await ctx.reply(
      "📦 <b>Komplekt (Set) darsliklar yuklash rejimiga xush kelibsiz!</b>\n\n" +
      "1️⃣ Ketma-ket ravishda PDF darslik fayllarini botga yuboring.\n" +
      "2️⃣ Har bir PDF fayl yuborilganda, bot sizdan ushbu darslik nomini so'raydi.\n" +
      "3️⃣ Barcha PDF fayllarni yuborib bo'lgach, <b>'✅ Komplektni tasdiqlash'</b> tugmasini bosing.",
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  bot.hears(["✏️ Kitobni tahrirlash", "✏️ Kitob tahrirlash"], async (ctx) => {
    await sendEditBooksMenu(ctx);
  });

  bot.hears(["🗑 Kitobni o'chirish", "🗑 Kitob o'chirish"], async (ctx) => {
    await sendDeleteBooksMenu(ctx);
  });

  bot.hears("📌 Chat ID (Ma'lumot)", async (ctx) => {
    const chatId = ctx.chat.id;
    const chatTitle = ctx.chat.type !== 'private' ? (ctx.chat as any).title : 'Shaxsiy chat';
    await ctx.reply(
      `📌 <b>Chat Ma'lumotlari:</b>\n\n` +
      `<b>Nomi:</b> ${chatTitle}\n` +
      `<b>Chat / Group ID:</b> <code>${chatId}</code>`,
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  // /categories Command
  bot.command('categories', async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
  });

  // Browse Books per Category
  bot.action('cat_action:browse', async (ctx) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } }
    });

    if (categories.length === 0) {
      await ctx.answerCbQuery("Hali kategoriyalar mavjud emas.", { show_alert: true });
      return;
    }

    const buttons = categories.map(c => [
      Markup.button.callback(`📁 ${c.name} (${c._count.books} ta kitob)`, `cat_books:${c.id}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    await ctx.editMessageText(
      "📂 <b>Kitoblarni ko'rish uchun kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Show books inside a specific category
  bot.action(/^cat_books:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { books: { orderBy: { name: 'asc' } } }
    });

    if (!category || category.books.length === 0) {
      await ctx.answerCbQuery("Ushbu kategoriyada hali kitoblar yo'q.", { show_alert: true });
      return;
    }

    const buttons = category.books.map(b => [
      Markup.button.callback(`${b.isSet ? '📦' : '📥'} ${b.name}`, `send_pdf:${b.id}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Kategoriyalarga qaytish", "cat_action:browse")]);

    await ctx.editMessageText(
      `📚 <b>${category.name}</b> kategoriyasidagi kitoblar:\n<i>(Yuklab olish uchun kitob ustiga bosing)</i>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Send PDF Callback handler
  bot.action(/^send_pdf:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({
      where: { id: bookId },
      include: { category: true }
    });

    if (!book || !book.tgFileId) {
      await ctx.answerCbQuery("Kitob topilmadi yoki fayl mavjud emas.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery("Fayllar yuborilmoqda...");
    try {
      if (book.isSet && book.setDetails) {
        const files: Array<{ name: string; fileId: string }> = JSON.parse(book.setDetails);
        const bookListStr = files.map((f, idx) => `${idx + 1}. ${f.name}`).join('\n');
        const caption = `📦 <b>${book.name}</b> (${files.length} ta darslik)\n\n📚 <b>Tarkibidagi darsliklar:</b>\n${bookListStr}`;
        
        const mediaGroup = files.map((f, index) => ({
          type: 'document' as const,
          media: f.fileId,
          caption: index === files.length - 1 ? caption : undefined,
          parse_mode: index === files.length - 1 ? ('HTML' as const) : undefined
        }));

        await ctx.replyWithMediaGroup(mediaGroup);
      } else {
        await ctx.replyWithDocument(book.tgFileId, {
          caption: `📖 <b>${book.name}</b>\n📂 Kategoriya: ${book.category ? book.category.name : 'Umumiy'}`,
          parse_mode: 'HTML'
        });
      }
    } catch (err: any) {
      console.error(`Failed to send PDF for book ${book.name}:`, err);
      await ctx.reply(`❌ Fayl yuborishda xatolik yuz berdi: ${err.message}`);
    }
  });

  // ─── Edit Book Callbacks & Handlers ─────────────────────────────────────────

  bot.action('edit_book_menu', async (ctx) => {
    await sendEditBooksMenu(ctx, true);
  });

  // Select Book to Edit
  bot.action(/^edit_book_select:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({
      where: { id: bookId },
      include: { category: true }
    });

    if (!book) {
      await ctx.answerCbQuery("Kitob topilmadi.", { show_alert: true });
      return;
    }

    let filesInfo = '';
    if (book.isSet && book.setDetails) {
      try {
        const files: Array<{ name: string; fileId: string }> = JSON.parse(book.setDetails);
        filesInfo = `\n\n📚 <b>To'plam tarkibidagi darsliklar (${files.length} ta):</b>\n` +
          files.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
      } catch (e) {}
    }

    const buttons: any[] = [
      [Markup.button.callback("✏️ Kitob/Komplekt nomini o'zgartirish", `edit_book_rename:${book.id}`)],
      [Markup.button.callback("📂 Kategoriyasini o'zgartirish", `edit_book_cat:${book.id}`)]
    ];

    if (book.isSet) {
      buttons.push([Markup.button.callback("➕ Komplektga fayl qo'shish", `edit_set_add_file:${book.id}`)]);
      buttons.push([Markup.button.callback("❌ Komplektdan fayl o'chirish", `edit_set_delfile_list:${book.id}`)]);
      buttons.push([Markup.button.callback("✏️ Komplektdagi fayl nomini tahrirlash", `edit_set_renfile_list:${book.id}`)]);
    }

    buttons.push([Markup.button.callback("⬅️ Kitoblar ro'yxatiga qaytish", "edit_book_menu")]);

    await ctx.editMessageText(
      `⚙️ <b>Kitob Sozlamalari va Tahrirlash:</b>\n\n` +
      `📖 <b>Nomi:</b> ${book.name}\n` +
      `📂 <b>Kategoriya:</b> ${book.category ? book.category.name : '—'}\n` +
      `📦 <b>Turi:</b> ${book.isSet ? "Komplekt (Set)" : "Bitta darslik"}` +
      filesInfo + `\n\nQaysi parametrni tahrirlamoqchisiz?`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Rename Book or Set Title
  bot.action(/^edit_book_rename:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book) {
      await ctx.answerCbQuery("Kitob topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_RENAME_BOOK', { bookId: book.id });
    await ctx.editMessageText(
      `✏️ <b>'${book.name}'</b> uchun yangi nom kiriting:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Change Book Category
  bot.action(/^edit_book_cat:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.answerCbQuery("Kategoriyalar mavjud emas.", { show_alert: true });
      return;
    }

    const buttons = categories.map(c => [
      Markup.button.callback(`📁 ${c.name}`, `edit_book_setcat:${bookId}:${c.id}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", `edit_book_select:${bookId}`)]);

    await ctx.editMessageText(
      "📂 <b>Yangi kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_book_setcat:(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const categoryId = parseInt(ctx.match[2]);

    try {
      const updated = await prisma.telegramBook.update({
        where: { id: bookId },
        data: { categoryId },
        include: { category: true }
      });

      await ctx.answerCbQuery("Kategoriya yangilandi!");
      await ctx.editMessageText(
        `✅ <b>'${updated.name}'</b> kitobi <b>${updated.category.name}</b> kategoriyasiga o'tkazildi!`,
        { parse_mode: 'HTML', ...buildCategoriesMenu() }
      );
    } catch (e: any) {
      await ctx.answerCbQuery("Xatolik yuz berdi.", { show_alert: true });
    }
  });

  // Add File to Set
  bot.action(/^edit_set_add_file:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_SET_ADD_FILE', { bookId: book.id });
    await ctx.editMessageText(
      `➕ <b>'${book.name}'</b> to'plamiga yangi darslik qo'shish:\n\n` +
      `Iltimos, qo'shmoqchi bo'lgan <b>PDF darslik faylini botga yuboring</b>:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Delete File list from Set
  bot.action(/^edit_set_delfile_list:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt ma'lumotlari topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    if (files.length <= 1) {
      await ctx.answerCbQuery("Komplektda kamida 1 ta fayl bo'lishi shart.", { show_alert: true });
      return;
    }

    const buttons = files.map((f, index) => [
      Markup.button.callback(`❌ O'chirish: ${index + 1}. ${f.name}`, `edit_set_delfile:${book.id}:${index}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", `edit_book_select:${book.id}`)]);

    await ctx.editMessageText(
      `❌ <b>Komplektdan o'chirmoqchi bo'lgan darslikni tanlang:</b>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_set_delfile:(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    if (fileIdx < 0 || fileIdx >= files.length) {
      await ctx.answerCbQuery("Fayl indeksi noto'g'ri.", { show_alert: true });
      return;
    }

    const removedFile = files.splice(fileIdx, 1)[0];
    const updated = await prisma.telegramBook.update({
      where: { id: bookId },
      data: {
        setDetails: JSON.stringify(files),
        tgFileId: files[0]?.fileId || book.tgFileId
      }
    });

    await ctx.answerCbQuery(`'${removedFile.name}' o'chirildi!`);
    await ctx.editMessageText(
      `✅ <b>'${removedFile.name}'</b> to'plamdan o'chirildi!\n` +
      `📦 <b>${updated.name}</b> tarkibida qolgan kitoblar: <b>${files.length} ta</b>`,
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
  });

  // Rename File list inside Set
  bot.action(/^edit_set_renfile_list:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    const buttons = files.map((f, index) => [
      Markup.button.callback(`✏️ Tahrirlash: ${index + 1}. ${f.name}`, `edit_set_renfile_ask:${book.id}:${index}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", `edit_book_select:${book.id}`)]);

    await ctx.editMessageText(
      `✏️ <b>Nomini tahrirlamoqchi bo'lgan darslikni tanlang:</b>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_set_renfile_ask:(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    const targetFile = files[fileIdx];
    if (!targetFile) {
      await ctx.answerCbQuery("Fayl topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_SET_FILE_RENAME', {
      bookId,
      fileIndex: fileIdx,
      oldName: targetFile.name,
    });

    await ctx.editMessageText(
      `✏️ <b>'${targetFile.name}'</b> darsligi uchun yangi nom kiriting:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // ─── Delete Book Callbacks ───────────────────────────────────────────────────

  bot.action('del_book_menu', async (ctx) => {
    await sendDeleteBooksMenu(ctx, true);
  });

  bot.action(/^del_book_ask:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book) {
      await ctx.answerCbQuery("Kitob topilmadi.", { show_alert: true });
      return;
    }

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback("✅ Ha, o'chirish", `del_book_confirm:${book.id}`)],
      [Markup.button.callback("❌ Bekor qilish", "del_book_cancel")]
    ]);

    await ctx.editMessageText(
      `⚠️ <b>Haqiqatdan ham bazadan o'chirmoqchimisiz?</b>\n\n📖 Kitob nomi: <b>${book.name}</b>\n🆔 ID: <code>${book.id}</code>`,
      { parse_mode: 'HTML', ...buttons }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^del_book_confirm:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    try {
      const deleted = await prisma.telegramBook.delete({ where: { id: bookId } });
      await ctx.answerCbQuery(`'${deleted.name}' o'chirildi!`);
      await ctx.editMessageText(
        `✅ <b>'${deleted.name}'</b> kitobi bazadan muvaffaqiyatli o'chirildi!`,
        { parse_mode: 'HTML', ...buildCategoriesMenu() }
      );
    } catch (err: any) {
      await ctx.answerCbQuery("Kitobni o'chirishda xatolik yuz berdi.", { show_alert: true });
    }
  });

  bot.action('del_book_cancel', async (ctx) => {
    await ctx.answerCbQuery("Bekor qilindi.");
    await sendDeleteBooksMenu(ctx, true);
  });

  // Add Category Callbacks
  bot.action('cat_action:add', async (ctx) => {
    await setSession(ctx.from!.id, 'WAITING_FOR_ADD_CATEGORY_NAME', {});
    await ctx.editMessageText(
      "➕ <b>Yangi kategoriya nomini kiriting:</b>\n<i>(masalan: 'Ingliz tili', 'Matematika')</i>",
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Edit Category Callbacks
  bot.action('cat_action:edit', async (ctx) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.answerCbQuery("Kategoriyalar mavjud emas.", { show_alert: true });
      return;
    }

    const buttons = categories.map(c => [Markup.button.callback(`✏️ ${c.name}`, `cat_edit:${c.id}`)]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    await ctx.editMessageText(
      "✏️ <b>Tahrirlash uchun kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^cat_edit:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      await ctx.answerCbQuery("Kategoriya topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_NEW_CATEGORY_NAME', { categoryId });
    await ctx.editMessageText(
      `✏️ <b>'${category.name}'</b> uchun yangi nom kiriting:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Delete Category Callbacks
  bot.action('cat_action:delete', async (ctx) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.answerCbQuery("Kategoriyalar mavjud emas.", { show_alert: true });
      return;
    }

    const buttons = categories.map(c => [Markup.button.callback(`[X] ${c.name}`, `cat_delete:${c.id}`)]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    await ctx.editMessageText(
      "🗑 <b>O'chirish uchun kategoriyani tanlang:</b>\n<i>(Kategoriya o'chirilsa u bilan bog'liq barcha kitoblar ham o'chib ketadi)</i>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^cat_delete:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    try {
      const deleted = await prisma.category.delete({ where: { id: categoryId } });
      await ctx.answerCbQuery(`'${deleted.name}' o'chirildi.`);
      
      const remaining = await prisma.category.findMany({ orderBy: { name: 'asc' } });
      if (remaining.length > 0) {
        const buttons = remaining.map(c => [Markup.button.callback(`[X] ${c.name}`, `cat_delete:${c.id}`)]);
        buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);
        await ctx.editMessageText(
          "🗑 <b>Kategoriya o'chirildi. Boshqasini ham o'chirasizmi?</b>",
          { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
        );
      } else {
        await ctx.editMessageText(
          "✅ Barcha kategoriyalar o'chirildi.",
          buildCategoriesMenu()
        );
      }
    } catch (e) {
      await ctx.answerCbQuery("Xatolik yuz berdi.", { show_alert: true });
    }
  });

  bot.action('cat_action:back', async (ctx) => {
    await clearSession(ctx.from!.id);
    await ctx.editMessageText(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
    await ctx.answerCbQuery();
  });

  // Confirm Set Files Callback
  bot.action('set_action:confirm_files', async (ctx) => {
    const session = await getSession(ctx.from!.id);
    const files = session.data.files || [];

    if (files.length === 0) {
      await ctx.answerCbQuery("Hali hech qanday PDF darslik yuborilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_SET_TITLE', { files });
    await ctx.editMessageText(
      `✅ <b>${files.length} ta darslik tanlandi.</b>\n\n` +
      `📝 Endi ushbu <b>Komplekt (To'plam) uchun umumiy nom</b> kiriting:\n` +
      `<i>(masalan: 'Oxford Word Skills A1+ Komplekt (2 ta kitob)')</i>`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Document Handler (Single & Set Upload FSM + Set Add File)
  bot.on('document', async (ctx) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.reply(
        "⚠️ Hech qanday kategoriya topilmadi. Avval /categories buyrug'i orqali kategoriya qo'shing."
      );
      return;
    }

    const fileId = ctx.message.document.file_id;
    const defaultFileName = ctx.message.document.file_name || 'Darslik';
    const session = await getSession(ctx.from.id);

    // If in SET ADD FILE mode
    if (session.state === 'WAITING_FOR_SET_ADD_FILE') {
      const bookId = session.data.bookId;
      await setSession(ctx.from.id, 'WAITING_FOR_SET_ADD_FILE_NAME', {
        bookId,
        pendingFileId: fileId,
        pendingFileName: defaultFileName,
      });

      await ctx.reply(
        `📝 <b>Qo'shilayotgan yangi darslik uchun nom kiriting:</b>\n` +
        `<i>(fayl nomi: ${defaultFileName})</i>`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // If in SET UPLOAD mode
    if (session.state === 'SET_UPLOAD_ACTIVE' || session.state === 'WAITING_FOR_SET_ITEM_NAME') {
      const files = session.data.files || [];
      await setSession(ctx.from.id, 'WAITING_FOR_SET_ITEM_NAME', {
        ...session.data,
        pendingFileId: fileId,
        pendingFileName: defaultFileName,
      });

      await ctx.reply(
        `📝 <b>${files.length + 1}-darslik uchun nom kiriting:</b>\n` +
        `<i>(fayl nomi: ${defaultFileName})</i>`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Default: Single book upload
    await setSession(ctx.from.id, 'WAITING_FOR_BOOK_CATEGORY', { fileId });
    const buttons = categories.map(c => [Markup.button.callback(c.name, `book_cat:${c.id}`)]);
    await ctx.reply(
      "📂 <b>Kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
  });

  // Book Category selected callback for Single book
  bot.action(/^book_cat:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    const session = await getSession(ctx.from!.id);

    if (session.state !== 'WAITING_FOR_BOOK_CATEGORY') {
      await ctx.answerCbQuery("Sessiya eskirgan. Hujjatni qaytadan yuboring.", { show_alert: true });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      await ctx.answerCbQuery("Kategoriya topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_BOOK_NAME', {
      fileId: session.data.fileId,
      categoryId,
      categoryName: category.name
    });

    await ctx.editMessageText(
      `✅ Kategoriya: <b>${category.name}</b>\n\n📝 Endi kitob nomini kiriting:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Set Category selected callback
  bot.action(/^set_cat:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    const session = await getSession(ctx.from!.id);

    if (session.state !== 'WAITING_FOR_SET_CATEGORY') {
      await ctx.answerCbQuery("Sessiya eskirgan. Qaytadan urinib ko'ring.", { show_alert: true });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      await ctx.answerCbQuery("Kategoriya topilmadi.", { show_alert: true });
      return;
    }

    const { setTitle, files } = session.data;
    const finalTitle = `📦 [Komplekt] ${setTitle}`;

    try {
      const bookRecord = await prisma.telegramBook.create({
        data: {
          tgFileId: files[0]?.fileId || '',
          tgMessageId: 0,
          name: finalTitle,
          categoryId: categoryId,
          isSet: true,
          setDetails: JSON.stringify(files),
        }
      });

      await clearSession(ctx.from!.id);
      await ctx.editMessageText(
        `🎉 <b>Komplekt darslik muvaffaqiyatli saqlandi!</b>\n\n` +
        `📦 Nomi: <b>${finalTitle}</b>\n` +
        `📚 Darsliklar soni: <b>${files.length} ta</b>\n` +
        `📂 Kategoriya: <b>${category.name}</b>\n\n` +
        `Endi ushbu to'plam veb-tizimda (Teacher View) 1 ta darslik bo'lib ko'rinadi!`,
        { parse_mode: 'HTML' }
      );
      await ctx.reply("👇 Asosiy menyu:", buildPersistentKeyboard());
      await ctx.answerCbQuery();
    } catch (e: any) {
      await clearSession(ctx.from!.id);
      await ctx.reply(`❌ Komplektni saqlashda xatolik: ${e.message}`);
    }
  });

  // General text messages FSM router
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const session = await getSession(ctx.from.id);

    // 1. Entering new file name to add to an existing Set
    if (session.state === 'WAITING_FOR_SET_ADD_FILE_NAME') {
      const { bookId, pendingFileId } = session.data;
      const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });

      if (!book || !book.isSet) {
        await clearSession(ctx.from.id);
        await ctx.reply("❌ Komplekt topilmadi.");
        return;
      }

      let files: Array<{ name: string; fileId: string }> = [];
      try { files = JSON.parse(book.setDetails || '[]'); } catch (e) {}

      files.push({ name: text, fileId: pendingFileId });

      const updated = await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });

      await clearSession(ctx.from.id);
      await ctx.reply(
        `✅ <b>'${text}'</b> fayli muvaffaqiyatli qo'shildi!\n\n` +
        `📦 <b>${updated.name}</b> tarkibidagi jami darsliklar: <b>${files.length} ta</b>`,
        { parse_mode: 'HTML', ...buildPersistentKeyboard() }
      );
    }
    // 2. Renaming a specific file inside a Set
    else if (session.state === 'WAITING_FOR_SET_FILE_RENAME') {
      const { bookId, fileIndex, oldName } = session.data;
      const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });

      if (!book || !book.isSet) {
        await clearSession(ctx.from.id);
        await ctx.reply("❌ Komplekt topilmadi.");
        return;
      }

      let files: Array<{ name: string; fileId: string }> = [];
      try { files = JSON.parse(book.setDetails || '[]'); } catch (e) {}

      if (files[fileIndex]) {
        files[fileIndex].name = text;
      }

      await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });

      await clearSession(ctx.from.id);
      await ctx.reply(
        `✅ Darslik nomi <b>'${oldName}'</b> dan <b>'${text}'</b> ga o'zgartirildi!`,
        { parse_mode: 'HTML', ...buildPersistentKeyboard() }
      );
    }
    // 3. Renaming a Book or Set title
    else if (session.state === 'WAITING_FOR_RENAME_BOOK') {
      const bookId = session.data.bookId;
      try {
        const updated = await prisma.telegramBook.update({
          where: { id: bookId },
          data: { name: text }
        });
        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ Kitob nomi muvaffaqiyatli saqlandi!\n📖 Yangi nom: <b>${updated.name}</b>`,
          { parse_mode: 'HTML', ...buildPersistentKeyboard() }
        );
      } catch (e: any) {
        await clearSession(ctx.from.id);
        await ctx.reply(`❌ Xatolik yuz berdi: ${e.message}`);
      }
    }
    // 4. Entering name for a single item in a Set during initial creation
    else if (session.state === 'WAITING_FOR_SET_ITEM_NAME') {
      const files = session.data.files || [];
      const updatedFiles = [...files, { name: text, fileId: session.data.pendingFileId }];

      await setSession(ctx.from.id, 'SET_UPLOAD_ACTIVE', {
        files: updatedFiles
      });

      await ctx.reply(
        `✅ <b>'${text}'</b> to'plamga qo'shildi!\n\n` +
        `📊 Hozircha to'plamda: <b>${updatedFiles.length} ta darslik</b> bor.\n\n` +
        `Yana PDF fayl yuborishingiz yoki to'plamni tasdiqlashingiz mumkin.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback("✅ Komplektni tasdiqlash", "set_action:confirm_files")]
          ])
        }
      );
    }
    // 5. Entering the title for the overall Set
    else if (session.state === 'WAITING_FOR_SET_TITLE') {
      const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
      await setSession(ctx.from.id, 'WAITING_FOR_SET_CATEGORY', {
        files: session.data.files,
        setTitle: text,
      });

      const buttons = categories.map(c => [Markup.button.callback(c.name, `set_cat:${c.id}`)]);
      await ctx.reply(
        `📦 Komplekt nomi: <b>${text}</b>\n\n📂 <b>Kategoriyani tanlang:</b>`,
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    }
    // 6. Adding Category Name
    else if (session.state === 'WAITING_FOR_ADD_CATEGORY_NAME') {
      try {
        const record = await prisma.category.create({ data: { name: text } });
        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kategoriya qo'shildi!</b>\n🆔 ID: <code>${record.id}</code>\n📂 Nomi: ${record.name}`,
          { parse_mode: 'HTML', ...buildCategoriesMenu() }
        );
      } catch (e: any) {
        if (e.code === 'P2002') {
          await ctx.reply(
            `⚠️ <b>'${text}'</b> kategoriyasi allaqachon mavjud.\nBoshqa nom kiriting:`,
            { parse_mode: 'HTML' }
          );
        } else {
          await clearSession(ctx.from.id);
          await ctx.reply(`❌ Xatolik yuz berdi: ${e.message}`);
        }
      }
    } 
    // 7. Editing Category Name
    else if (session.state === 'WAITING_FOR_NEW_CATEGORY_NAME') {
      const categoryId = session.data.categoryId;
      try {
        const record = await prisma.category.update({
          where: { id: categoryId },
          data: { name: text }
        });
        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kategoriya yangilandi!</b>\n📂 Yangi nom: ${record.name}`,
          { parse_mode: 'HTML', ...buildCategoriesMenu() }
        );
      } catch (e: any) {
        if (e.code === 'P2002') {
          await ctx.reply(
            `⚠️ <b>'${text}'</b> nomi allaqachon mavjud.\nBoshqa nom kiriting:`,
            { parse_mode: 'HTML' }
          );
        } else {
          await clearSession(ctx.from.id);
          await ctx.reply(`❌ Xatolik yuz berdi: ${e.message}`);
        }
      }
    } 
    // 8. Entering Single Book Name
    else if (session.state === 'WAITING_FOR_BOOK_NAME') {
      const { fileId, categoryId, categoryName } = session.data;
      
      try {
        const bookRecord = await prisma.telegramBook.create({
          data: {
            tgFileId: fileId,
            tgMessageId: 0,
            name: text,
            categoryId: categoryId,
            isSet: false,
          }
        });

        const bookId = bookRecord.id;
        const caption = `ID: ${bookId}\nName: ${text}\nSubject: ${categoryName}`;

        let tgMsgId = 0;
        try {
          const channelMsg = await bot.telegram.sendDocument(STORAGE_CHANNEL_ID, fileId, {
            caption: caption
          });
          tgMsgId = channelMsg.message_id;
        } catch (channelErr: any) {
          console.warn('[Telegram Channel Post Warning]:', channelErr.message);
        }

        await prisma.telegramBook.update({
          where: { id: bookId },
          data: { tgMessageId: tgMsgId }
        });

        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kitob muvaffaqiyatli saqlandi!</b>\n\n🆔 ID: <code>${bookId}</code>\n📖 Nomi: ${text}\n📂 Kategoriya: ${categoryName}`,
          { parse_mode: 'HTML', ...buildPersistentKeyboard() }
        );

      } catch (e: any) {
        await clearSession(ctx.from.id);
        await ctx.reply(`❌ Kitobni saqlashda xatolik: ${e.message}`);
      }
    } 
    else {
      return next();
    }
  });
}

// Helper: Send Edit Books Menu
async function sendEditBooksMenu(ctx: any, isEditMessage = false) {
  try {
    const books = await prisma.telegramBook.findMany({
      orderBy: { id: 'asc' },
      include: { category: true }
    });

    if (books.length === 0) {
      const text = "✏️ <b>Bazada tahrirlash uchun kitoblar mavjud emas.</b>";
      if (isEditMessage) {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...buildCategoriesMenu() });
      } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...buildPersistentKeyboard() });
      }
      return;
    }

    const buttons = books.map(b => [
      Markup.button.callback(`✏️ ${b.isSet ? '📦' : '📖'} ${b.name}`, `edit_book_select:${b.id}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    const text = "✏️ <b>Tahrirlash uchun kitobni tanlang:</b>";

    if (isEditMessage) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
  } catch (err: any) {
    await ctx.reply(`❌ Kitoblarni yuklashda xatolik: ${err.message}`);
  }
}

// Helper: Send Delete Books Menu
async function sendDeleteBooksMenu(ctx: any, isEditMessage = false) {
  try {
    const books = await prisma.telegramBook.findMany({
      orderBy: { id: 'asc' },
      include: { category: true }
    });

    if (books.length === 0) {
      const text = "🗑 <b>Bazada o'chirish uchun kitoblar mavjud emas.</b>";
      if (isEditMessage) {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...buildCategoriesMenu() });
      } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...buildPersistentKeyboard() });
      }
      return;
    }

    const buttons = books.map(b => [
      Markup.button.callback(`🗑 O'chirish: ${b.name}`, `del_book_ask:${b.id}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    const text = "🗑 <b>O'chirish uchun kitobni tanlang:</b>\n<i>(Ogohlantirish: Bazadan o'chirilgan kitob qayta tiklanmaydi)</i>";

    if (isEditMessage) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
  } catch (err: any) {
    await ctx.reply(`❌ Kitoblarni yuklashda xatolik: ${err.message}`);
  }
}

// Helper: Send All Books List
async function sendAllBooksList(ctx: any) {
  try {
    const books = await prisma.telegramBook.findMany({
      orderBy: { id: 'asc' },
      include: { category: true }
    });

    if (books.length === 0) {
      await ctx.reply(
        "📚 <b>Hali hech qanday kitob mavjud emas.</b>\n\nKitob yuklash uchun PDF faylingizni botga yuboring.",
        { parse_mode: 'HTML', ...buildPersistentKeyboard() }
      );
      return;
    }

    const buttons = books.map(b => [
      Markup.button.callback(`${b.isSet ? '📦' : '📥'} ${b.name} (${b.category ? b.category.name : 'Umumiy'})`, `send_pdf:${b.id}`)
    ]);

    await ctx.reply(
      "📚 <b>Mavjud kitoblar ro'yxati (PDF):</b>\n<i>(Faylni yuklab olish uchun kerakli kitob ustiga bosing)</i>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
  } catch (err: any) {
    await ctx.reply(`❌ Kitoblarni yuklashda xatolik: ${err.message}`);
  }
}
