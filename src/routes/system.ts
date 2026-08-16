import { Router } from 'express';
import { prisma } from '../prisma';
import { bot, formatChatId, getStaffGroupId, getSupplierGroupId } from '../telegram';

const router = Router();

const lastRequests: any[] = [];
const recentBotChats = new Map<number | string, { id: number | string; title: string; type: string; lastSeen: string }>();

// Telegram Webhook Logging Middleware
export const webhookLogger = (req: any, res: any, next: any) => {
  try {
    const update = req.body;
    const chat = update?.message?.chat || update?.my_chat_member?.chat || update?.channel_post?.chat || update?.edited_message?.chat;
    if (chat && chat.id) {
      recentBotChats.set(chat.id, {
        id: chat.id,
        title: chat.title || chat.username || chat.first_name || 'Chat',
        type: chat.type || 'unknown',
        lastSeen: new Date().toISOString(),
      });
    }
  } catch (_) {}

  lastRequests.push({
    timestamp: new Date().toISOString(),
    path: req.path,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  if (lastRequests.length > 20) lastRequests.shift();
  next();
};

// POST /telegram-webhook — Direct Telegraf update handler for Vercel & Express
router.post('/telegram-webhook', async (req, res) => {
  try {
    webhookLogger(req, res, () => {});
    await bot.handleUpdate(req.body, res);
  } catch (err: any) {
    console.error('[Telegram Webhook Handle Error]:', err.message);
    if (!res.headersSent) res.sendStatus(200);
  }
});

// GET /webhook-debug
router.get('/webhook-debug', (req, res) => {
  res.json(lastRequests);
});

// GET /backend/bot-chats — Returns all Telegram groups/chats captured by webhook
router.get('/backend/bot-chats', (req, res) => {
  res.json(Array.from(recentBotChats.values()));
});

// Live Telegram Webhook Diagnostic Route
router.get('/webhook-info', async (req, res) => {
  try {
    const info = await bot.telegram.getWebhookInfo();
    
    // Test bot token authentication
    let botInfo = {};
    try {
      botInfo = await bot.telegram.getMe();
    } catch (e: any) {
      botInfo = { error: `Failed to authenticate bot token: ${e.message}` };
    }

    // Test database connection
    let dbStatus = '';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (e: any) {
      dbStatus = `ERROR: ${e.message}`;
    }

    res.json({
      webhook_domain_env: process.env.WEBHOOK_DOMAIN || 'NOT_SET',
      bot_token_env: process.env.BOT_TOKEN ? `SET (starts with ${process.env.BOT_TOKEN.slice(0, 5)}...)` : 'NOT_SET',
      database_connection: dbStatus,
      bot_details: botInfo,
      telegram_webhook_info: info
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/system/test-staff-group — send a test message to the configured STAFF_GROUP_ID
router.post('/backend/system/test-staff-group', async (req, res) => {
  const rawEnvId = process.env.STAFF_GROUP_ID || '';

  try {
    const targetChatId = getStaffGroupId();

    const msg = await bot.telegram.sendMessage(
      targetChatId,
      `✅ <b>SmartBook ERP Test Xabari!</b>\n\n` +
      `📌 Xodimlar Telegram Guruhi (STAFF_GROUP_ID) muvaffaqiyatli ulangan!\n` +
      `🆔 Vercel Env ID: <code>${rawEnvId}</code>\n` +
      `🆔 Formatted Chat ID: <code>${targetChatId}</code>\n` +
      `⏰ Sana/Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>\n\n` +
      `⏳ <i>Ushbu test xabari 1 daqiqadan so'ng avtomatik o'chiriladi.</i>`,
      { parse_mode: 'HTML' }
    );

    // Auto-delete test message after 1 minute (60 seconds)
    setTimeout(async () => {
      try {
        await bot.telegram.deleteMessage(targetChatId, msg.message_id);
        console.log(`[Auto-Delete]: Test staff message ${msg.message_id} in ${targetChatId} deleted after 1 min.`);
      } catch (err: any) {
        console.warn('[Auto-Delete Warning]:', err.message);
      }
    }, 60 * 1000);

    res.json({
      success: true,
      rawEnvId,
      chatId: targetChatId,
      messageId: msg.message_id,
      text: `Test xabari xodimlar guruhiga yuborildi! (1 daqiqadan so'ng avtomatik o'chiriladi)`
    });
  } catch (e: any) {
    let formattedId = '';
    try { formattedId = getStaffGroupId(); } catch (_) {}

    console.error('[Test Staff Group Error]:', e.message);
    res.status(400).json({
      error: `Telegramga yuborishda xatolik: ${e.message} (Vercel Env ID: "${rawEnvId}" -> Target Chat ID: "${formattedId}"). Bot guruhda admin ekanligini va Group ID to'g'riligini tekshiring.`
    });
  }
});

// POST /backend/system/test-supplier-group — send a test message to the configured SUPPLIER_GROUP_ID
router.post('/backend/system/test-supplier-group', async (req, res) => {
  const rawEnvId = process.env.SUPPLIER_GROUP_ID || process.env.NEXT_PUBLIC_SUPPLIER_GROUP_ID || process.env.STAFF_GROUP_ID || '';

  try {
    const targetChatId = getSupplierGroupId();

    const msg = await bot.telegram.sendMessage(
      targetChatId,
      `🧪 <b>SmartBook ERP Ta'minotchi Test Xabari!</b>\n\n` +
      `📦 Ta'minotchi Telegram Guruhi (SUPPLIER_GROUP_ID) muvaffaqiyatli ulangan!\n` +
      `🆔 Vercel Env ID: <code>${rawEnvId}</code>\n` +
      `🆔 Formatted Chat ID: <code>${targetChatId}</code>\n` +
      `⏰ Sana/Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>\n\n` +
      `⏳ <i>Ushbu test xabari 1 daqiqadan so'ng avtomatik o'chiriladi.</i>`,
      { parse_mode: 'HTML' }
    );

    // Auto-delete test message after 1 minute (60 seconds)
    setTimeout(async () => {
      try {
        await bot.telegram.deleteMessage(targetChatId, msg.message_id);
        console.log(`[Auto-Delete]: Test supplier message ${msg.message_id} in ${targetChatId} deleted after 1 min.`);
      } catch (err: any) {
        console.warn('[Auto-Delete Warning]:', err.message);
      }
    }, 60 * 1000);

    res.json({
      success: true,
      rawEnvId,
      chatId: targetChatId,
      messageId: msg.message_id,
      text: `Test xabari ta'minotchi guruhiga yuborildi! (1 daqiqadan so'ng avtomatik o'chiriladi)`
    });
  } catch (e: any) {
    let formattedId = '';
    try { formattedId = getSupplierGroupId(); } catch (_) {}

    console.error('[Test Supplier Group Error]:', e.message);
    res.status(400).json({
      error: `Ta'minotchi Telegram guruhiga yuborishda xatolik: ${e.message} (Vercel Env ID: "${rawEnvId}" -> Target Chat ID: "${formattedId}"). Bot guruhda admin ekanligini va Group ID to'g'riligini tekshiring.`
    });
  }
});

// POST /backend/wipe-orders-groups-students — delete orders, groups, and students (preserve books and users)
router.post('/backend/wipe-orders-groups-students', async (req, res) => {
  try {
    const deletedOrders = await prisma.erpOrder.deleteMany({});
    const deletedStudents = await prisma.erpStudent.deleteMany({});
    const deletedGroups = await prisma.erpGroup.deleteMany({});
    res.json({
      success: true,
      message: 'Orders, students, and groups deleted successfully.',
      deletedOrders: deletedOrders.count,
      deletedStudents: deletedStudents.count,
      deletedGroups: deletedGroups.count,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
