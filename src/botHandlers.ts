import { bot } from './telegram';
import { setupCommands } from './bot/commands';
import { setupActions } from './bot/actions';
import { setupTextHandlers } from './bot/textHandlers';
import { setupDocumentHandlers } from './bot/documentHandlers';

export { getSession, setSession, clearSession } from './bot/session';
export { buildPersistentKeyboard, buildCategoriesMenu } from './bot/keyboards';
export { syncStorageChannel, deleteStorageChannelMsg, sendSupplierBreakdownList, sendBooksCSV } from './bot/helpers';

// Initialize all Telegram Bot handlers
setupCommands(bot);
setupActions(bot);
setupTextHandlers(bot);
setupDocumentHandlers(bot);
