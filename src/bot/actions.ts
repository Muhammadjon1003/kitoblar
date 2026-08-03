import { Telegraf, Markup } from 'telegraf';
import { clearSession, setSession, getSession } from './session';
import { buildCategoriesMenu } from './keyboards';
import { syncStorageChannel, deleteStorageChannelMsg, sendSupplierBreakdownList, sendBooksCSV, sendDeleteBooksMenu, sendEditBooksMenu, sendAllBooksMenu } from './helpers';
import { cleanBookName } from '../routes/books';
import { getStorageChannelId } from '../telegram';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupActions(bot: Telegraf<any>) {
  bot.action('send_supplier_list_to_group', async (ctx) => {
    await sendSupplierBreakdownList(ctx, true);
  });

  bot.action('cat_action:browse', async (ctx) => {
    await sendAllBooksMenu(ctx, true);
    await ctx.answerCbQuery();
  });

  // Browse Books in a Category
  bot.action(/^browse_cat:(.+)$/, async (ctx) => {
    const catIdStr = ctx.match[1];
    let books: any[] = [];
    let title = '';

    if (catIdStr === 'all') {
      books = await prisma.telegramBook.findMany({
        include: { category: true },
        orderBy: { id: 'asc' }
      });
      title = "📚 <b>BARCHA DARSLIKLAR VA KOMPLEKTLAR RO'YXATI:</b>";
    } else {
      const catId = parseInt(catIdStr);
      const category = await prisma.category.findUnique({
        where: { id: catId },
        include: { books: true }
      });
      if (!category) {
        await ctx.answerCbQuery("Kategoriya topilmadi.", { show_alert: true });
        return;
      }
      books = category.books;
      title = `📂 <b>${category.name}</b> kategoriyasidagi darsliklar:`;
    }

    if (books.length === 0) {
      await ctx.answerCbQuery("Ushbu kategoriyada darsliklar yo'q.", { show_alert: true });
      return;
    }

    const buttons = books.map(b => {
      const icon = b.isSet ? '📦' : '📖';
      return [Markup.button.callback(`${icon} ${b.name}`, `send_book:${b.id}`)];
    });
    buttons.push([Markup.button.callback("⬅️ Orqaga", "cat_action:browse")]);

    await ctx.editMessageText(
      `${title}\n\n<i>(Yuklab olish uchun darslik tugmasini bosing)</i>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Send PDF document or media group to user
  bot.action(/^send_book:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({
      where: { id: bookId },
      include: { category: true }
    });

    if (!book) {
      await ctx.answerCbQuery("Darslik topilmadi.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery("📥 PDF fayllar yuborilmoqda...");

    try {
      if (book.isSet && book.setDetails) {
        let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
        try { files = JSON.parse(book.setDetails); } catch (e) {}

        const caption = `📦 <b>Komplekt Nomi:</b> ${book.name}\n📂 <b>Kategoriya:</b> ${book.category?.name || 'Umumiy'}`;

        const mediaGroup = files.map((f, index) => ({
          type: 'document' as const,
          media: f.fileId,
          caption: index === files.length - 1 ? caption : undefined,
          parse_mode: 'HTML' as const
        }));

        await ctx.replyWithMediaGroup(mediaGroup);
      } else {
        const caption = `📖 <b>Darslik Nomi:</b> ${book.name}\n📂 <b>Kategoriya:</b> ${book.category?.name || 'Umumiy'}`;
        await ctx.replyWithDocument(book.tgFileId, { caption, parse_mode: 'HTML' });
      }
    } catch (err: any) {
      await ctx.reply(`❌ PDF yuborishda xatolik: ${err.message}`);
    }
  });

  bot.action('cat_action:add', async (ctx) => {
    await setSession(ctx.from!.id, 'WAITING_FOR_ADD_CATEGORY_NAME', {});
    await ctx.editMessageText(
      "➕ <b>Yangi kategoriya nomini kiriting:</b>\n<i>(masalan: 'Ingliz tili', 'Matematika')</i>",
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

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
      const booksInCat = await prisma.telegramBook.findMany({ where: { categoryId } });
      for (const b of booksInCat) {
        if (b.tgMessageId) await deleteStorageChannelMsg(b.tgMessageId);
      }

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

  // Edit Book Callbacks
  bot.action('edit_book_menu', async (ctx) => {
    await sendEditBooksMenu(ctx, true);
  });

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

    const buttons = [];
    if (book.isSet) {
      buttons.push([Markup.button.callback("✏️ Komplekt Nomini Tahrirlash", `edit_set_name_ask:${book.id}`)]);
      buttons.push([Markup.button.callback("⚙️ Komplekt Ichidagi Fayllarni Tahrirlash", `edit_set_renfile_list:${book.id}`)]);
      buttons.push([Markup.button.callback("➕ Yangi Fayl Qo'shish", `edit_set_addfile_start:${book.id}`)]);
      buttons.push([Markup.button.callback("🗑 Faylni O'chirish", `edit_set_delfile_list:${book.id}`)]);
    } else {
      buttons.push([Markup.button.callback("✏️ Kitob Nomini Tahrirlash", `edit_book_rename_ask:${book.id}`)]);
    }
    buttons.push([Markup.button.callback("⬅️ Orqaga", "edit_book_menu")]);

    await ctx.editMessageText(
      `📖 <b>Kitob/Komplekt:</b> ${book.name}\n` +
      `📂 <b>Kategoriya:</b> ${book.category?.name || 'Umumiy'}\n` +
      `📌 <b>Turi:</b> ${book.isSet ? '📦 Komplekt' : '📖 Yakka Darslik'}\n\n` +
      `Nimani tahrirlamoqchisiz?`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_book_rename_ask:(\d+)$/, async (ctx) => {
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

  bot.action(/^edit_set_name_ask:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_RENAME_BOOK', { bookId: book.id });
    await ctx.editMessageText(
      `✏️ <b>'${book.name}'</b> komplekti uchun yangi umumiy nom kiriting:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_set_addfile_start:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    await setSession(ctx.from!.id, 'WAITING_FOR_SET_ADD_FILE', { bookId: book.id });
    await ctx.editMessageText(
      `📥 <b>'${book.name}' komplektiga yangi fayl qo'shish:</b>\n\n` +
      `Iltimos, qo'shmoqchi bo'lgan PDF faylingizni yuboring:`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_set_delfile_list:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    const buttons = files.map((f, index) => [
      Markup.button.callback(`[X] O'chirish: ${f.name}`, `edit_set_delfile_confirm:${book.id}:${index}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Orqaga", `edit_book_select:${book.id}`)]);

    await ctx.editMessageText(
      `🗑 <b>O'chirmoqchi bo'lgan darslikni tanlang:</b>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^edit_set_delfile_confirm:(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    if (files.length <= 1) {
      await ctx.answerCbQuery("Komplektda kamida 1 ta darslik qolishi kerak!", { show_alert: true });
      return;
    }

    const removedFile = files.splice(fileIdx, 1)[0];

    const updated = await prisma.telegramBook.update({
      where: { id: bookId },
      data: { setDetails: JSON.stringify(files) }
    });

    await syncStorageChannel(book.id);

    await ctx.answerCbQuery(`'${removedFile.name}' o'chirildi!`);
    await ctx.editMessageText(
      `✅ <b>'${removedFile.name}'</b> to'plamdan o'chirildi!\n` +
      `📦 <b>${updated.name}</b> tarkibida qolgan kitoblar: <b>${files.length} ta</b>`,
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
  });

  // Rename & Type File list inside Set
  bot.action(/^edit_set_renfile_list:(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    const buttons = files.map((f, index) => {
      const isComp = f.isMain === false || f.fileType === 'COVER' || f.fileType === 'SUPPLEMENT';
      const icon = isComp ? (f.fileType === 'COVER' ? '🖼' : '📄') : '📖';
      const parentTag = isComp && f.parentFileId ? ` (-> ${f.parentFileId})` : '';
      return [
        Markup.button.callback(`${icon} ${index + 1}. ${f.name}${parentTag}`, `edit_set_file_opts:${book.id}:${index}`)
      ];
    });
    buttons.push([Markup.button.callback("⬅️ Orqaga", `edit_book_select:${book.id}`)]);

    await ctx.editMessageText(
      `⚙️ <b>Tahrirlamoqchi bo'lgan faylni tanlang:</b>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Options for a specific file inside Set
  bot.action(/^edit_set_file_opts:(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    const targetFile = files[fileIdx];
    if (!targetFile) {
      await ctx.answerCbQuery("Fayl topilmadi.", { show_alert: true });
      return;
    }

    const currentType = targetFile.fileType || (targetFile.isMain === false ? 'SUPPLEMENT' : 'MAIN');

    const buttons = [
      [Markup.button.callback("✏️ Nomini o'zgartirish", `edit_set_renfile_ask:${book.id}:${fileIdx}`)],
      [Markup.button.callback(currentType === 'MAIN' ? "📖 [Hozirgi: Asosiy Darslik]" : "📖 Asosiy Darslik qilish", `set_file_type:${book.id}:${fileIdx}:MAIN`)],
      [Markup.button.callback(currentType === 'COVER' ? "🖼 [Hozirgi: Muqova]" : "🖼 Muqova qilish", `set_file_type:${book.id}:${fileIdx}:COVER`)],
      [Markup.button.callback(currentType === 'SUPPLEMENT' ? "📄 [Hozirgi: Qo'shimcha]" : "📄 Qo'shimcha qilish", `set_file_type:${book.id}:${fileIdx}:SUPPLEMENT`)],
      [Markup.button.callback("⬅️ Orqaga", `edit_set_renfile_list:${book.id}`)]
    ];

    await ctx.editMessageText(
      `⚙️ <b>Fayl:</b> ${targetFile.name}\n` +
      `📌 <b>Hozirgi turi:</b> ${currentType === 'MAIN' ? '📖 Asosiy Darslik' : (currentType === 'COVER' ? '🖼 Muqova' : '📄 Qo\'shimcha')}\n` +
      (targetFile.parentFileId ? `🔗 <b>Biriktirilgan darslik:</b> ${targetFile.parentFileId}\n` : '') +
      `\nAmalni tanlang:`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
    await ctx.answerCbQuery();
  });

  // Set file type callback
  bot.action(/^set_file_type:(\d+):(\d+):(MAIN|COVER|SUPPLEMENT)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);
    const newType = ctx.match[3] as 'MAIN' | 'COVER' | 'SUPPLEMENT';

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    if (!files[fileIdx]) {
      await ctx.answerCbQuery("Fayl topilmadi.", { show_alert: true });
      return;
    }

    const isMain = newType === 'MAIN';
    files[fileIdx].fileType = newType;
    files[fileIdx].isMain = isMain;

    if (isMain) {
      files[fileIdx].parentFileId = undefined;
      await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });
      await syncStorageChannel(book.id);
      await ctx.answerCbQuery("📖 Asosiy Darslik qilib belgilandi!");
      await ctx.editMessageText(
        `✅ <b>'${files[fileIdx].name}'</b> "Asosiy Darslik" qilib belgilandi!`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Orqaga", `edit_set_file_opts:${book.id}:${fileIdx}`)]])
        }
      );
      return;
    }

    // If COVER or SUPPLEMENT: ask which main book to bind to
    const mainBooks = files.filter((f, idx) => idx !== fileIdx && (f.isMain !== false && f.fileType !== 'COVER' && f.fileType !== 'SUPPLEMENT'));

    if (mainBooks.length === 0) {
      files[fileIdx].parentFileId = files[0]?.name || '';
      await prisma.telegramBook.update({
        where: { id: bookId },
        data: { setDetails: JSON.stringify(files) }
      });
      await syncStorageChannel(book.id);
      await ctx.answerCbQuery("Turi saqlandi!");
      await ctx.editMessageText(
        `✅ <b>'${files[fileIdx].name}'</b> turi o'zgartirildi!`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Orqaga", `edit_set_file_opts:${book.id}:${fileIdx}`)]])
        }
      );
      return;
    }

    const parentButtons = mainBooks.map((mb, mIdx) => [
      Markup.button.callback(`📖 ${mb.name}`, `set_file_parent:${bookId}:${fileIdx}:${files.indexOf(mb)}`)
    ]);
    parentButtons.push([Markup.button.callback("⬅️ Orqaga", `edit_set_file_opts:${bookId}:${fileIdx}`)]);

    await ctx.editMessageText(
      `🔗 <b>'${files[fileIdx].name}' (${newType === 'COVER' ? 'Muqova' : 'Qo\'shimcha'}) qaysi darslikka biriktirilsin?</b>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(parentButtons) }
    );
    await ctx.answerCbQuery();
  });

  // Set file parent binding callback
  bot.action(/^set_file_parent:(\d+):(\d+):(\d+)$/, async (ctx) => {
    const bookId = parseInt(ctx.match[1]);
    const fileIdx = parseInt(ctx.match[2]);
    const parentIdx = parseInt(ctx.match[3]);

    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet || !book.setDetails) {
      await ctx.answerCbQuery("Komplekt topilmadi.", { show_alert: true });
      return;
    }

    let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
    try { files = JSON.parse(book.setDetails); } catch (e) {}

    if (!files[fileIdx] || !files[parentIdx]) {
      await ctx.answerCbQuery("Fayl topilmadi.", { show_alert: true });
      return;
    }

    files[fileIdx].parentFileId = files[parentIdx].name;

    await prisma.telegramBook.update({
      where: { id: bookId },
      data: { setDetails: JSON.stringify(files) }
    });

    await syncStorageChannel(book.id);

    await ctx.answerCbQuery("Biriktirildi!");
    await ctx.editMessageText(
      `✅ <b>'${files[fileIdx].name}'</b> darslik <b>'${files[parentIdx].name}'</b> ga biriktirildi!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Orqaga", `edit_set_file_opts:${book.id}:${fileIdx}`)]])
      }
    );
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

  // Delete Book Callbacks
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
      const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
      if (book && book.tgMessageId) {
        await deleteStorageChannelMsg(book.tgMessageId);
      }

      const deleted = await prisma.telegramBook.delete({ where: { id: bookId } });
      await ctx.answerCbQuery(`'${deleted.name}' o'chirildi!`);
      await ctx.editMessageText(
        `✅ <b>'${deleted.name}'</b> kitobi bazadan va saqlash kanalidan muvaffaqiyatli o'chirildi!`,
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
      categoryName: category.name,
    });

    await ctx.editMessageText(
      `📂 Kategoriya: <b>${category.name}</b>\n\n` +
      `📝 Endi ushbu <b>Darslik uchun nom</b> kiriting:\n` +
      `<i>(masalan: 'English File Elementary Student Book')</i>`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery();
  });

  // Set Category selected callback for Set
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

    const files = session.data.files || [];
    const setTitle = cleanBookName(session.data.setTitle || 'Komplekt');

    try {
      const fileListStr = files.map((f: any, i: number) => `${i + 1}. ${f.name}`).join('\n');
      const tempCaption = `🆔 (saqlanmoqda...)\n📦 Nomi: ${setTitle}\n📂 Kategoriya: ${category.name}\n\n📚 Tarkibidagi darsliklar (${files.length} ta):\n${fileListStr}`;
      
      const storageChannelId = getStorageChannelId();
      let tgMessageId = 0;

      if (storageChannelId) {
        try {
          const sentMsg = await bot.telegram.sendDocument(storageChannelId, files[0].fileId, {
            caption: tempCaption
          });
          tgMessageId = sentMsg.message_id;
        } catch (e: any) {
          console.warn('[Storage Channel Post Warning]:', e.message);
        }
      }

      const record = await prisma.telegramBook.create({
        data: {
          name: setTitle,
          tgFileId: files[0].fileId,
          tgMessageId,
          categoryId,
          isSet: true,
          setDetails: JSON.stringify(files)
        }
      });

      await syncStorageChannel(record.id);
      await clearSession(ctx.from!.id);

      await ctx.editMessageText(
        `🎉 <b>Komplekt muvaffaqiyatli saqlandi!</b>\n\n` +
        `🆔 ID: <code>${record.id}</code>\n` +
        `📦 Nomi: <b>${record.name}</b>\n` +
        `📂 Kategoriya: <b>${category.name}</b>\n` +
        `📚 Jami kitoblar: <b>${files.length} ta</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (e: any) {
      await clearSession(ctx.from!.id);
      await ctx.editMessageText(`❌ Komplektni saqlashda xatolik: ${e.message}`);
    }
    await ctx.answerCbQuery();
  });
}
