import { Router } from 'express';
import { prisma } from '../prisma';
import { bot } from '../telegram';

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
