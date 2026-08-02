import { Telegraf, Markup } from 'telegraf';
import { getSession, setSession } from './session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupDocumentHandlers(bot: Telegraf<any>) {
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
}
