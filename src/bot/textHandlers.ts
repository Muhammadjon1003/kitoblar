import { Telegraf, Markup } from 'telegraf';
import { clearSession, setSession, getSession } from './session';
import { buildPersistentKeyboard, buildCategoriesMenu } from './keyboards';
import { syncStorageChannel, sendSupplierBreakdownList, sendBooksCSV, sendDeleteBooksMenu, sendEditBooksMenu, sendAllBooksMenu } from './helpers';
import { cleanBookName } from '../routes/books';
import { getStorageChannelId } from '../telegram';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupTextHandlers(bot: Telegraf<any>) {
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const session = await getSession(ctx.from.id);

    // Menu shortcuts
    if (text === "📚 Barcha kitoblar (PDF)") {
      await clearSession(ctx.from.id);
      await sendAllBooksMenu(ctx, false);
      return;
    }

    if (text === "📊 CSV faylda yuklash") {
      await clearSession(ctx.from.id);
      await sendBooksCSV(ctx);
      return;
    }

    if (text === "📂 Kategoriyalar") {
      await clearSession(ctx.from.id);
      await ctx.reply(
        "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
        { parse_mode: 'HTML', ...buildCategoriesMenu() }
      );
      return;
    }

    if (text === "📥 Kitob yuklash (Bitta)") {
      await clearSession(ctx.from.id);
      await ctx.reply(
        "📥 <b>Yakka tartibdagi PDF darslik yuklash:</b>\n\n" +
        "Iltimos, darslikning PDF faylini ushbu botga yuboring."
      );
      return;
    }

    if (text === "📦 Komplekt kitoblar yuklash") {
      await setSession(ctx.from.id, 'SET_UPLOAD_ACTIVE', { files: [] });
      await ctx.reply(
        "📦 <b>Komplekt (To'plam) darsliklar yaratish rejimi yoqildi!</b>\n\n" +
        "1. Komplektga kiruvchi <b>birinchi PDF darslikni</b> botga yuboring.\n" +
        "2. Har bir yuborilgan fayl uchun alohida nom kiritasiz.\n" +
        "3. Barcha fayllar yuborilgach <b>'✅ Komplektni tasdiqlash'</b> tugmasini bosing.",
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (text === "✏️ Kitobni tahrirlash") {
      await clearSession(ctx.from.id);
      await sendEditBooksMenu(ctx, false);
      return;
    }

    if (text === "🗑 Kitobni o'chirish") {
      await clearSession(ctx.from.id);
      await sendDeleteBooksMenu(ctx, false);
      return;
    }

    if (text === "📌 Chat ID (Ma'lumot)") {
      await ctx.reply(`🆔 Sizning Telegram Chat ID: <code>${ctx.chat.id}</code>`, { parse_mode: 'HTML' });
      return;
    }

    if (text === "🚚 Ta'minotchi ro'yxati") {
      await sendSupplierBreakdownList(ctx, false);
      return;
    }

    // 1. Entering new file name to add to an existing Set
    if (session.state === 'WAITING_FOR_SET_ADD_FILE_NAME') {
      const { bookId, pendingFileId } = session.data;
      const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });

      if (!book || !book.isSet) {
        await clearSession(ctx.from.id);
        await ctx.reply("❌ Komplekt topilmadi.");
        return;
      }

      let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
      try { files = JSON.parse(book.setDetails || '[]'); } catch (e) {}

      const cleanName = cleanBookName(text);
      files.push({
        name: cleanName,
        fileId: pendingFileId,
        isMain: true,
        fileType: 'MAIN'
      });

      const updated = await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });

      await syncStorageChannel(updated.id);

      const addedFileIdx = files.length - 1;
      await clearSession(ctx.from.id);

      const typeButtons = [
        [Markup.button.callback("📖 Asosiy Darslik", `set_file_type:${bookId}:${addedFileIdx}:MAIN`)],
        [Markup.button.callback("🖼 Muqova", `set_file_type:${bookId}:${addedFileIdx}:COVER`)],
        [Markup.button.callback("📄 Qo'shimcha", `set_file_type:${bookId}:${addedFileIdx}:SUPPLEMENT`)]
      ];

      await ctx.reply(
        `✅ <b>'${cleanName}'</b> fayli muvaffaqiyatli qo'shildi!\n\n` +
        `🏷 <b>Ushbu fayl turini tanlang:</b>`,
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(typeButtons) }
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
        const cleanName = cleanBookName(text);
        files[fileIndex].name = cleanName;
      }

      await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });

      await syncStorageChannel(book.id);

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
        const cleanName = cleanBookName(text);

        const updated = await prisma.telegramBook.update({
          where: { id: bookId },
          data: { name: cleanName }
        });

        await syncStorageChannel(updated.id);

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
      const cleanName = cleanBookName(text);
      const updatedFiles = [...files, { name: cleanName, fileId: session.data.pendingFileId, isMain: true, fileType: 'MAIN' }];

      await setSession(ctx.from.id, 'SET_UPLOAD_ACTIVE', {
        files: updatedFiles
      });

      await ctx.reply(
        `✅ <b>'${cleanName}'</b> to'plamga qo'shildi!\n\n` +
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
      const cleanName = cleanBookName(text);
      await setSession(ctx.from.id, 'WAITING_FOR_SET_CATEGORY', {
        files: session.data.files,
        setTitle: cleanName,
      });

      const buttons = categories.map(c => [Markup.button.callback(c.name, `set_cat:${c.id}`)]);
      await ctx.reply(
        `📦 Komplekt nomi: <b>${cleanName}</b>\n\n📂 <b>Kategoriyani tanlang:</b>`,
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
    // 7. Renaming Category Name
    else if (session.state === 'WAITING_FOR_NEW_CATEGORY_NAME') {
      const categoryId = session.data.categoryId;
      try {
        const updated = await prisma.category.update({
          where: { id: categoryId },
          data: { name: text }
        });
        await clearSession(ctx.from.id);
        await ctx.reply(
          `✅ <b>Kategoriya tahrirlandi!</b>\n🆔 ID: <code>${updated.id}</code>\n📂 Yangi nomi: ${updated.name}`,
          { parse_mode: 'HTML', ...buildCategoriesMenu() }
        );
      } catch (e: any) {
        await clearSession(ctx.from.id);
        await ctx.reply(`❌ Xatolik yuz berdi: ${e.message}`);
      }
    }
    // 8. Entering name for a Single Book
    else if (session.state === 'WAITING_FOR_BOOK_NAME') {
      const { fileId, categoryId, categoryName } = session.data;
      const cleanName = cleanBookName(text);

      try {
        const tempCaption = `🆔 (saqlanmoqda...)\n📖 Nomi: ${cleanName}\n📂 Kategoriya: ${categoryName}`;
        const storageChannelId = getStorageChannelId();
        let tgMessageId = 0;

        if (storageChannelId) {
          try {
            const sentMsg = await bot.telegram.sendDocument(storageChannelId, fileId, {
              caption: tempCaption
            });
            tgMessageId = sentMsg.message_id;
          } catch (e: any) {
            console.warn('[Storage Channel Post Warning]:', e.message);
          }
        }

        const record = await prisma.telegramBook.create({
          data: {
            name: cleanName,
            tgFileId: fileId,
            tgMessageId,
            categoryId,
            isSet: false
          }
        });

        await syncStorageChannel(record.id);
        await clearSession(ctx.from.id);

        await ctx.reply(
          `🎉 <b>Darslik muvaffaqiyatli saqlandi va Saqlash Kanaliga yuborildi!</b>\n\n` +
          `🆔 ID: <code>${record.id}</code>\n` +
          `📖 Nomi: <b>${record.name}</b>\n` +
          `📂 Kategoriya: <b>${categoryName}</b>`,
          { parse_mode: 'HTML', ...buildPersistentKeyboard() }
        );
      } catch (e: any) {
        await clearSession(ctx.from.id);
        await ctx.reply(`❌ Darslikni saqlashda xatolik yuz berdi: ${e.message}`);
      }
    } else {
      return next();
    }
  });
}
