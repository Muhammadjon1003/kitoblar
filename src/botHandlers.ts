import { bot } from './telegram';
import { setupCommands } from './bot/commands';
import { setupActions } from './bot/actions';
import { setupTextHandlers } from './bot/textHandlers';
import { setupDocumentHandlers } from './bot/documentHandlers';
import { isTelegramUserAllowed } from './bot/auth';

export { getSession, setSession, clearSession } from './bot/session';
export { buildPersistentKeyboard, buildCategoriesMenu } from './bot/keyboards';
export { syncStorageChannel, deleteStorageChannelMsg, sendSupplierBreakdownList, sendBooksCSV } from './bot/helpers';
export { isTelegramUserAllowed, allowTelegramUser, revokeTelegramUser, getAllowedTelegramUsers } from './bot/auth';

let handlersRegistered = false;

export function registerBotHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // Middleware: Global Whitelist Access Control
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const allowed = await isTelegramUserAllowed(userId);
    if (!allowed) {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery("⛔️ Kechirasiz, sizga ushbu botdan foydalanish uchun ruxsat berilmagan.", { show_alert: true });
      } else {
        await ctx.reply(
          `⛔️ <b>Kechirasiz, sizga ushbu botdan foydalanish uchun ruxsat berilmagan!</b>\n\n` +
          `🆔 Sizning Telegram Chat ID: <code>${userId}</code>\n\n` +
          `<i>(Ushbu Chat ID ni bot administratoriga yuborib ruxsat so'rang)</i>`,
          { parse_mode: 'HTML' }
        );
      }
      return;
    }

    return next();
  });

  // Initialize all Telegram Bot handlers
  setupCommands(bot);
  setupActions(bot);
  setupTextHandlers(bot);
  setupDocumentHandlers(bot);
}

// Auto-register handlers when imported
registerBotHandlers();
