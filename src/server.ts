import express from 'express';
import multer from 'multer';
import { bot, uploadToTelegramChannel } from './telegram';
import { registerBotHandlers } from './botHandlers';
import { createSmartOrder } from './orderService';
import * as dotenv from 'dotenv';
dotenv.config();

// Register all Telegram Bot commands, document uploads, and FSM handlers
registerBotHandlers();

const app = express();
app.use(express.json());

// Enable CORS middleware (allows frontend to call backend on different Vercel domains)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Default status route
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    service: 'SmartBook ERP Backend API',
    webhook: '/telegram-webhook',
    endpoints: ['POST /api/orders/smart-create', 'GET /webhook-info', 'GET /webhook-debug', 'GET /api/books']
  });
});

// Fetch all uploaded books from Neon PostgreSQL (with optional categoryId filter)
app.get('/backend/books', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where: any = {};
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }
    const books = await prisma.telegramBook.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'asc' }
    });
    res.json(books);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Fetch all categories from Neon PostgreSQL
app.get('/backend/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Live request logger for debugging webhooks
const lastRequests: any[] = [];

app.all('/telegram-webhook', (req, res, next) => {
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
});

app.get('/webhook-debug', (req, res) => {
  res.json(lastRequests);
});

// Live Telegram Webhook Diagnostic Route
app.get('/webhook-info', async (req, res) => {
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
    const prisma = new (require('@prisma/client').PrismaClient)();
    let dbStatus = '';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (e: any) {
      dbStatus = `ERROR: ${e.message}`;
    } finally {
      await prisma.$disconnect();
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

// Set up Multer using Memory Storage to ensure 0GB disk usage
const upload = multer({ storage: multer.memoryStorage() });

// 1. Serverless File Attachment & Smart Order Endpoint
app.post('/api/orders/smart-create', upload.single('bookFile'), async (req, res) => {
  try {
    const { studentId, title, teacherId, adminOverride } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Book file is required.' });
    }

    // Stream directly from RAM buffer to Telegram
    const tgFileId = await uploadToTelegramChannel(file.buffer, file.originalname);

    // Trigger the Smart Order Logic
    const result = await createSmartOrder(
      parseInt(studentId),
      title,
      parseInt(teacherId),
      tgFileId,
      adminOverride === 'true'
    );

    res.status(201).json({
      message: 'Order processed successfully.',
      tgFileId_stored: tgFileId,
      result
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Setup Telegram Webhook or Polling
const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;

if (WEBHOOK_DOMAIN) {
  const cleanDomain = WEBHOOK_DOMAIN.replace(/\/$/, '');
  app.use(bot.webhookCallback('/telegram-webhook'));
  bot.telegram.setWebhook(`${cleanDomain}/telegram-webhook`);
  console.log(`Webhook set to ${cleanDomain}/telegram-webhook`);
} else {
  // Polling for local development
  bot.launch();
  console.log('Telegram bot started in polling mode.');
}

// Only listen on a port if we are NOT running as a Vercel Serverless Function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Enable graceful stop (only outside Vercel)
if (!process.env.VERCEL) {
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

export default app;
