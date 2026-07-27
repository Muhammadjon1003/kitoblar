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
    data: JSON.parse(session.data),
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
    ["📥 Kitob yuklash bo'yicha", "📌 Chat ID (Ma'lumot)"]
  ]).resize();
}

function buildCategoriesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📂 Kategoriyalardagi kitoblar", 'cat_action:browse')],
    [Markup.button.callback("➕ Yangi kategoriya qo'shish", 'cat_action:add')],
    [Markup.button.callback("✏️ Kategoriya tahrirlash", 'cat_action:edit')],
    [Markup.button.callback("🗑 Kategoriya o'chirish", 'cat_action:delete')]
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

  bot.hears("📥 Kitob yuklash bo'yicha", async (ctx) => {
    await ctx.reply(
      "📥 <b>Kitob yuklash tartibi:</b>\n\n" +
      "Botga har qanday <b>PDF, EPUB, DOCX</b> kitob faylini yuboring.\n" +
      "Bot sizdan kategoriyani va kitob nomini so'raydi va bazaga avtomatik saqlaydi.",
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
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
      Markup.button.callback(`📥 ${b.name}`, `send_pdf:${b.id}`)
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

    await ctx.answerCbQuery("Fayl yuborilmoqda...");
    try {
      await ctx.replyWithDocument(book.tgFileId, {
        caption: `📖 <b>${book.name}</b>\n📂 Kategoriya: ${book.category ? book.category.name : 'Umumiy'}`,
        parse_mode: 'HTML'
      });
    } catch (err: any) {
      console.error(`Failed to send PDF for book ${book.name}:`, err);
      await ctx.reply(`❌ Fayl yuborishda xatolik yuz berdi: ${err.message}`);
    }
  });

  // Add Category Callback
  bot.action('cat_action:add', async (ctx) => {
    await setSession(ctx.from!.id, 'WAITING_FOR_ADD_CATEGORY_NAME', {});
    await ctx.editMessageText(
      "➕ <b>Yangi kategoriya nomi</b>\n\nKategoriya nomini kiriting:",
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Edit Category List Callback
  bot.action('cat_action:edit', async (ctx) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.answerCbQuery("Kategoriyalar mavjud emas.", { show_alert: true });
      return;
    }

    const buttons = categories.map(c => [Markup.button.callback(c.name, `cat_edit:${c.id}`)]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:back")]);

    await ctx.editMessageText(
      "✏️ <b>Tahrirlash uchun kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Edit Selected Category callback
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

  // Delete Category List Callback
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

  // Delete Selected Category callback
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

  // Back to Menu Callback
  bot.action('cat_action:back', async (ctx) => {
    await clearSession(ctx.from!.id);
    await ctx.editMessageText(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
    await ctx.answerCbQuery();
  });

  // Document Handler (Book upload triggers FSM)
  bot.on('document', async (ctx) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      await ctx.reply(
        "⚠️ Hech qanday kategoriya topilmadi. Avval /categories buyrug'i orqali kategoriya qo'shing."
      );
      return;
    }

    const fileId = ctx.message.document.file_id;
    await setSession(ctx.from.id, 'WAITING_FOR_BOOK_CATEGORY', { fileId });

    const buttons = categories.map(c => [Markup.button.callback(c.name, `book_cat:${c.id}`)]);
    await ctx.reply(
      "📂 <b>Kategoriyani tanlang:</b>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
  });

  // Book Category selected callback
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

  // General text messages
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const session = await getSession(ctx.from.id);

    if (session.state === 'WAITING_FOR_ADD_CATEGORY_NAME') {
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
    else if (session.state === 'WAITING_FOR_BOOK_NAME') {
      const { fileId, categoryId, categoryName } = session.data;
      
      try {
        const bookRecord = await prisma.telegramBook.create({
          data: {
            tgFileId: fileId,
            tgMessageId: 0,
            name: text,
            categoryId: categoryId
          }
        });

        const bookId = bookRecord.id;
        const caption = `ID: ${bookId}\nName: ${text}\nSubject: ${categoryName}`;

        const channelMsg = await bot.telegram.sendDocument(STORAGE_CHANNEL_ID, fileId, {
          caption: caption
        });

        await prisma.telegramBook.update({
          where: { id: bookId },
          data: { tgMessageId: channelMsg.message_id }
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
      Markup.button.callback(`📥 ${b.name} (${b.category ? b.category.name : 'Umumiy'})`, `send_pdf:${b.id}`)
    ]);

    await ctx.reply(
      "📚 <b>Mavjud kitoblar ro'yxati (PDF):</b>\n<i>(Faylni yuklab olish uchun kerakli kitob ustiga bosing)</i>",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
  } catch (err: any) {
    await ctx.reply(`❌ Kitoblarni yuklashda xatolik: ${err.message}`);
  }
}
