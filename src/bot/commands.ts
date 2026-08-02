import { Telegraf } from 'telegraf';
import { clearSession, setSession } from './session';
import { buildPersistentKeyboard, buildCategoriesMenu } from './keyboards';
import { getAllowedTelegramUsers, allowTelegramUser, revokeTelegramUser } from './auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupCommands(bot: Telegraf<any>) {
  bot.command('start', async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      `👋 <b>Smartbooks Telegram Boshqaruv Botiga Xush Kelibsiz!</b>\n\n` +
      `Quyidagi menyu orqali darslik va komplektlarni boshqarishingiz mumkin:`,
      { parse_mode: 'HTML', ...buildPersistentKeyboard() }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `ℹ️ <b>Mavjud buyruqlar va menyu bo'limlari:</b>\n\n` +
      `• 📚 <b>Barcha kitoblar (PDF)</b> — Bazadagi darsliklarni ko'rish\n` +
      `• 📊 <b>CSV faylda yuklash</b> — Darsliklar katalogini CSV eksport qilish\n` +
      `• 📂 <b>Kategoriyalar</b> — Kategoriyalarni yaratish/tahrirlash/o'chirish\n` +
      `• 📥 <b>Kitob yuklash (Bitta)</b> — Yakka tartibdagi PDF darslik yuklash\n` +
      `• 📦 <b>Komplekt kitoblar yuklash</b> — Bir necha PDF kitobdan iborat to'plam yaratish\n` +
      `• ✏️ <b>Kitobni tahrirlash</b> — Kitob/komplekt nomini o'zgartirish\n` +
      `• 🗑 <b>Kitobni o'chirish</b> — Bazadan kitob o'chirish\n` +
      `• 🚚 <b>/supplier</b> — Ta'minotchi va Ombor uchun zarur darsliklar ro'yxati`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('categories', async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply(
      "📂 <b>Kategoriyalar boshqaruvi</b>\n\nAmalni tanlang:",
      { parse_mode: 'HTML', ...buildCategoriesMenu() }
    );
  });

  bot.command('editbook', async (ctx) => {
    await clearSession(ctx.from.id);
    await sendEditBooksMenu(ctx, false);
  });

  bot.command('delbook', async (ctx) => {
    await clearSession(ctx.from.id);
    await sendDeleteBooksMenu(ctx, false);
  });

  bot.command('supplier', async (ctx) => {
    await sendSupplierBreakdownList(ctx, false);
  });

  bot.command('csv', async (ctx) => {
    await sendBooksCSV(ctx);
  });

  bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 Sizning Telegram Chat ID: <code>${ctx.chat.id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('addfile', async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(' ');
    if (parts.length < 2) {
      await ctx.reply("⚠️ Foydalanish: <code>/addfile &lt;book_id&gt;</code>\nMasalan: <code>/addfile 5</code>", { parse_mode: 'HTML' });
      return;
    }
    const bookId = parseInt(parts[1]);
    const book = await prisma.telegramBook.findUnique({ where: { id: bookId } });
    if (!book || !book.isSet) {
      await ctx.reply("❌ Komplekt topilmadi yoki bu oddiy kitob.");
      return;
    }

    await setSession(ctx.from.id, 'WAITING_FOR_SET_ADD_FILE', { bookId: book.id });
    await ctx.reply(
      `📥 <b>'${book.name}' komplektiga yangi fayl qo'shish:</b>\n\n` +
      `Iltimos, qo'shmoqchi bo'lgan PDF faylingizni yuboring:`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('whitelist', async (ctx) => {
    const { dbUsers, envList } = await getAllowedTelegramUsers();
    let text = `🔐 <b>TELEGRAM BOT RUXSAT BERILGAN USERLAR RO'YXATI</b>\n\n`;

    if (envList.length > 0) {
      text += `<b>⚙️ .env faylidagilar:</b>\n`;
      envList.forEach(id => {
        text += `• <code>${id}</code>\n`;
      });
      text += `\n`;
    }

    if (dbUsers.length > 0) {
      text += `<b>🗄 Ma'lumotlar bazasidagilar:</b>\n`;
      dbUsers.forEach(u => {
        text += `• <code>${u.chatId}</code> ${u.fullName ? `(${u.fullName})` : ''}\n`;
      });
    } else if (envList.length === 0) {
      text += `<i>Hali hech kimga maxsus ruxsat berilmagan.</i>\n`;
    }

    text += `\n📌 <b>Yangi userga ruxsat berish:</b>\n<code>/allow &lt;chatId&gt; [ism]</code>\n\n📌 <b>Ruxsatni bekor qilish:</b>\n<code>/revoke &lt;chatId&gt;</code>`;
    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('allow', async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("⚠️ Foydalanish: <code>/allow &lt;chatId&gt; [ism]</code>\nMasalan: <code>/allow 123456789 Alisher</code>", { parse_mode: 'HTML' });
      return;
    }
    const targetChatId = parts[1];
    const name = parts.slice(2).join(' ');
    const ok = await allowTelegramUser(targetChatId, name);
    if (ok) {
      await ctx.reply(`✅ <code>${targetChatId}</code> ID egasiga botdan foydalanish uchun ruxsat berildi!`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Ruxsat berishda xatolik yuz berdi.`);
    }
  });

  bot.command('revoke', async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("⚠️ Foydalanish: <code>/revoke &lt;chatId&gt;</code>\nMasalan: <code>/revoke 123456789</code>", { parse_mode: 'HTML' });
      return;
    }
    const targetChatId = parts[1];
    const ok = await revokeTelegramUser(targetChatId);
    if (ok) {
      await ctx.reply(`🚫 <code>${targetChatId}</code> ID egasidan bot ruxsati bekor qilindi!`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Ruxsatni bekor qilishda xatolik yuz berdi.`);
    }
  });
}
