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

  // Middleware 1: Ignore ALL incoming updates from Groups, Supergroups, and Channels.
  // The bot MUST ONLY interact in private 1-on-1 chats (`ctx.chat?.type === 'private'`).
  bot.use(async (ctx, next) => {
    const chatType = ctx.chat?.type;
    if (chatType && chatType !== 'private') {
      // Completely ignore group/supergroup/channel updates — do not reply or process
      return;
    }
    return next();
  });

  // Middleware 2: Global Whitelist Access Control (Private Chats Only)
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

  // Global Error Handler: Replies directly with error message ONLY in private chat
  bot.catch(async (err: any, ctx: any) => {
    const errMsg = err.message || String(err);
    console.error(`[Telegraf Global Error Catch] Update ${ctx.updateType}:`, errMsg);
    try {
      if (ctx.chat?.type !== 'private') return;
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(`❌ Bot xatoligi: ${errMsg.slice(0, 100)}`, { show_alert: true });
      }
      if (ctx.reply) {
        await ctx.reply(
          `❌ <b>Botda xatolik yuz berdi:</b>\n<code>${errMsg}</code>`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (_) {}
  });

  // Initialize all Telegram Bot handlers
  setupCommands(bot);
  setupActions(bot);
  setupTextHandlers(bot);
  setupDocumentHandlers(bot);
}

// Auto-register handlers when imported
registerBotHandlers();
