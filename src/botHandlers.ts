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

function buildMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ Kategoriya qo'shish", 'cat_action:add')],
    [Markup.button.callback("✏️ Kategoriya tahrirlash", 'cat_action:edit')],
    [Markup.button.callback("🗑 Kategoriya o'chirish", 'cat_action:delete')]
  ]);
}

// ─── Bot Handlers ────────────────────────────────────────────────────────────

export function registerBotHandlers() {
  
  // 1. /categories Command
  bot.command('categories', async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildMainMenu() }
    );
  });

  // 2. Add Category Callback
  bot.action('cat_action:add', async (ctx) => {
    await setSession(ctx.from!.id, 'WAITING_FOR_ADD_CATEGORY_NAME', {});
    await ctx.editMessageText(
      "➕ <b>Yangi kategoriya nomi</b>\n\nKategoriya nomini kiriting:",
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // 3. Edit Category List Callback
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

  // 4. Edit Selected Category callback
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

  // 5. Delete Category List Callback
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

  // 6. Delete Selected Category callback
  bot.action(/^cat_delete:(\d+)$/, async (ctx) => {
    const categoryId = parseInt(ctx.match[1]);
    try {
      const deleted = await prisma.category.delete({ where: { id: categoryId } });
      await ctx.answerCbQuery(`'${deleted.name}' o'chirildi.`);
      
      // Refresh the delete list
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
          buildMainMenu()
        );
      }
    } catch (e) {
      await ctx.answerCbQuery("Xatolik yuz berdi.", { show_alert: true });
    }
  });

  // 7. Back to Menu Callback
  bot.action('cat_action:back', async (ctx) => {
    await clearSession(ctx.from!.id);
    await ctx.editMessageText(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildMainMenu() }
    );
    await ctx.answerCbQuery();
  });

  // 8. Document Handler (Book upload triggers FSM)
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

  // 9. Book Category selected callback
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

  // 10. General text messages (Handles text FSM responses)
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const session = await getSession(ctx.from.id);

    if (session.state === 'WAITING_FOR_ADD_CATEGORY_NAME') {
      try {
        const record = await prisma.category.create({ data: { name: text } });
        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kategoriya qo'shildi!</b>\n🆔 ID: <code>${record.id}</code>\n📂 Nomi: ${record.name}`,
          { parse_mode: 'HTML', ...buildMainMenu() }
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
          { parse_mode: 'HTML', ...buildMainMenu() }
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
        // 1. Create a placeholder row to get the autoincrement ID
        const bookRecord = await prisma.telegramBook.create({
          data: {
            tgFileId: fileId,
            tgMessageId: 0, // Placeholder
            name: text,
            categoryId: categoryId
          }
        });

        const bookId = bookRecord.id;

        // 2. Prepare the caption format
        const caption = `ID: ${bookId}\nName: ${text}\nSubject: ${categoryName}`;

        // 3. Send file to Telegram Channel
        const channelMsg = await bot.telegram.sendDocument(STORAGE_CHANNEL_ID, fileId, {
          caption: caption
        });

        // 4. Update the DB row with the real message id
        await prisma.telegramBook.update({
          where: { id: bookId },
          data: { tgMessageId: channelMsg.message_id }
        });

        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kitob muvaffaqiyatli saqlandi!</b>\n\n🆔 ID: <code>${bookId}</code>\n📖 Nomi: ${text}\n📂 Kategoriya: ${categoryName}`,
          { parse_mode: 'HTML' }
        );

      } catch (e: any) {
        await clearSession(ctx.from.id);
        await ctx.reply(`❌ Kitobni saqlashda xatolik: ${e.message}`);
      }
    } 
    else {
      // Pass execution to next middleware if not in FSM state
      return next();
    }
  });
}
