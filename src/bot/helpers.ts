import { bot, STORAGE_CHANNEL_ID, getStaffGroupId } from '../telegram';
import { cleanBookName, generateBooksCSVBuffer } from '../routes/books';
import { PrismaClient } from '@prisma/client';
import { Markup } from 'telegraf';

const prisma = new PrismaClient();

export async function syncStorageChannel(bookId: number) {
  try {
    const book = await prisma.telegramBook.findUnique({
      where: { id: bookId },
      include: { category: true }
    });
    if (!book || !book.tgMessageId) return;

    const categoryName = book.category ? book.category.name : 'Umumiy';
    if (book.isSet && book.setDetails) {
      const files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = JSON.parse(book.setDetails);
      const mainFiles = files.filter(f => f.isMain !== false && f.fileType !== 'COVER' && f.fileType !== 'SUPPLEMENT');
      const fileListStr = files.map((f, i) => {
        const isComp = f.isMain === false || f.fileType === 'COVER' || f.fileType === 'SUPPLEMENT';
        const tag = isComp ? (f.fileType === 'COVER' ? ' 🖼 [Muqova]' : ' 📄 [Qo\'shimcha]') : '';
        return `${i + 1}. ${f.name}${tag}`;
      }).join('\n');
      const caption = `🆔 ID: ${book.id}\n📦 Nomi: ${book.name}\n📂 Kategoriya: ${categoryName}\n\n📚 Tarkibidagi darsliklar (${mainFiles.length} ta asosiy darslik):\n${fileListStr}`;
      await bot.telegram.editMessageCaption(STORAGE_CHANNEL_ID, book.tgMessageId, undefined, caption);
    } else {
      const caption = `🆔 ID: ${book.id}\n📖 Nomi: ${book.name}\n📂 Kategoriya: ${categoryName}`;
      await bot.telegram.editMessageCaption(STORAGE_CHANNEL_ID, book.tgMessageId, undefined, caption);
    }
  } catch (e: any) {
    console.warn('[Storage Channel Auto-Sync Warning]:', e.message);
  }
}

export async function deleteStorageChannelMsg(tgMessageId: number) {
  if (!tgMessageId) return;
  try {
    await bot.telegram.deleteMessage(STORAGE_CHANNEL_ID, tgMessageId);
  } catch (e: any) {
    console.warn('[Storage Channel Auto-Delete Warning]:', e.message);
  }
}

export async function sendSupplierBreakdownList(ctx: any, sendToStaffGroup = false) {
  try {
    const orders = await prisma.erpOrder.findMany({
      where: { status: { in: ['CREATED', 'ORDERED'] } },
      include: { student: true }
    });

    if (orders.length === 0) {
      if (ctx) await ctx.reply("ℹ️ Hozircha buyurtma qilingan faol darsliklar mavjud emas.");
      return;
    }

    const bookIds = Array.from(new Set(orders.map(o => parseInt(o.bookId)).filter(id => !isNaN(id))));
    const books = await prisma.telegramBook.findMany({
      where: { id: { in: bookIds } }
    });
    const bookMap = new Map(books.map(b => [String(b.id), b]));

    const supplierItemsMap: Record<string, number> = {};
    const warehouseItemsMap: Record<string, number> = {};

    for (const o of orders) {
      const bookObj = bookMap.get(o.bookId);
      const bookName = bookObj ? bookObj.name : 'Darslik';

      if (bookObj?.isSet && bookObj?.setDetails) {
        let files: Array<{ name: string; fileId: string }> = [];
        try { files = JSON.parse(bookObj.setDetails); } catch (e) {}
        for (const f of files) {
          const cleanName = cleanBookName(f.name);
          const stock = await prisma.warehouseStock.findFirst({
            where: { fileId: f.fileId, quantity: { gt: 0 } }
          });
          if (stock && stock.quantity > 0) {
            warehouseItemsMap[cleanName] = (warehouseItemsMap[cleanName] || 0) + 1;
          } else {
            supplierItemsMap[cleanName] = (supplierItemsMap[cleanName] || 0) + 1;
          }
        }
      } else {
        const cleanName = cleanBookName(bookName);
        supplierItemsMap[cleanName] = (supplierItemsMap[cleanName] || 0) + 1;
      }
    }

    let text = `🚚 <b>YETKAZILISHI KERAK BO'LGAN DARSLIKLAR RO'YXATI</b>\n\n`;

    const supplierEntries = Object.entries(supplierItemsMap);
    if (supplierEntries.length > 0) {
      text += `<b>Ta'minotchidan:</b>\n`;
      supplierEntries.forEach(([title, qty]) => {
        text += `${title} - ${qty}ta\n`;
      });
      text += `\n`;
    }

    const warehouseEntries = Object.entries(warehouseItemsMap);
    if (warehouseEntries.length > 0) {
      text += `<b>Ombor zaxirasidan:</b>\n`;
      warehouseEntries.forEach(([title, qty]) => {
        text += `${title} - ${qty}ta\n`;
      });
    }

    if (sendToStaffGroup) {
      const staffGroupId = getStaffGroupId();
      await bot.telegram.sendMessage(staffGroupId, text, { parse_mode: 'HTML' });
      if (ctx) await ctx.reply("✅ <b>Xodimlar ro'yxati Telegram guruhiga yuborildi!</b>");
      return;
    }

    const buttons = [
      [Markup.button.callback("✈️ Xodimlar guruhiga yuborish (Staff Group)", "send_supplier_list_to_group")]
    ];

    if (ctx) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });
    }
  } catch (err: any) {
    if (ctx) await ctx.reply(`❌ Ro'yxat tuzishda xatolik: ${err.message}`);
  }
}

export async function sendBooksCSV(ctx: any) {
  try {
    const books = await prisma.telegramBook.findMany({
      include: { category: true },
      orderBy: [
        { categoryId: 'asc' },
        { id: 'asc' }
      ]
    });

    if (books.length === 0) {
      if (ctx) await ctx.reply("❌ Hozircha bazada darsliklar mavjud emas.");
      return;
    }

    const csvBuffer = generateBooksCSVBuffer(books);
    if (ctx) {
      await ctx.replyWithDocument({
        source: csvBuffer,
        filename: `Smartbooks_Darsliklar_Katalogi_${new Date().toISOString().slice(0, 10)}.csv`
      }, {
        caption: `📊 <b>Smartbooks Darsliklar va Komplektlar Katalogi (CSV)</b>\n\nJami: <b>${books.length} ta</b> darslik va komplektlar.`,
        parse_mode: 'HTML'
      });
    }
  } catch (err: any) {
    if (ctx) await ctx.reply(`❌ CSV tayyorlashda xatolik: ${err.message}`);
  }
}

export async function sendDeleteBooksMenu(ctx: any, isEdit = false) {
  const books = await prisma.telegramBook.findMany({
    include: { category: true },
    orderBy: { id: 'asc' }
  });

  if (books.length === 0) {
    const text = "❌ Bazada o'chirish uchun kitoblar yo'q.";
    if (isEdit && ctx.editMessageText) {
      await ctx.editMessageText(text);
    } else if (ctx.reply) {
      await ctx.reply(text);
    }
    return;
  }

  const buttons = books.map(b => [
    Markup.button.callback(`[X] ${b.name} (${b.category?.name || 'Umumiy'})`, `del_book_ask:${b.id}`)
  ]);

  const text = "🗑 <b>Bazadan o'chirish uchun kitobni tanlang:</b>";
  if (isEdit && ctx.editMessageText) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else if (ctx.reply) {
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  }
}

export async function sendEditBooksMenu(ctx: any, isEdit = false) {
  const books = await prisma.telegramBook.findMany({
    include: { category: true },
    orderBy: { id: 'asc' }
  });

  if (books.length === 0) {
    const text = "❌ Bazada tahrirlash uchun kitoblar yo'q.";
    if (isEdit && ctx.editMessageText) {
      await ctx.editMessageText(text);
    } else if (ctx.reply) {
      await ctx.reply(text);
    }
    return;
  }

  const buttons = books.map(b => [
    Markup.button.callback(`✏️ ${b.name} (${b.category?.name || 'Umumiy'})`, `edit_book_select:${b.id}`)
  ]);

  const text = "✏️ <b>Tahrirlash uchun kitobni tanlang:</b>";
  if (isEdit && ctx.editMessageText) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else if (ctx.reply) {
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  }
}

export async function sendAllBooksMenu(ctx: any, isEdit = false) {
  const categories = await prisma.category.findMany({
    include: { books: true },
    orderBy: { name: 'asc' }
  });

  if (categories.length === 0) {
    const text = "❌ Hozircha bazada darsliklar kategoriyasi mavjud emas.";
    if (isEdit && ctx.editMessageText) {
      await ctx.editMessageText(text);
    } else if (ctx.reply) {
      await ctx.reply(text);
    }
    return;
  }

  const buttons = categories.map(c => [
    Markup.button.callback(`📂 ${c.name} (${c.books.length} ta darslik)`, `browse_cat:${c.id}`)
  ]);

  buttons.push([Markup.button.callback("📚 Barcha darsliklar (Hamma ro'yxat)", "browse_cat:all")]);

  const text = "📚 <b>PDF Darslik va Komplektlarni yuklab olish uchun kategoriyani tanlang:</b>";
  if (isEdit && ctx.editMessageText) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else if (ctx.reply) {
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  }
}
