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

// Default status route
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    service: 'SmartBook ERP Backend API',
    webhook: '/telegram-webhook',
    endpoints: ['POST /api/orders/smart-create', 'GET /webhook-info']
  });
});

// Live Telegram Webhook Diagnostic Route
app.get('/webhook-info', async (req, res) => {
  try {
    const info = await bot.telegram.getWebhookInfo();
    res.json({
      webhook_domain_env: process.env.WEBHOOK_DOMAIN || 'NOT_SET',
      bot_token_env: process.env.BOT_TOKEN ? `SET (starts with ${process.env.BOT_TOKEN.slice(0, 5)}...)` : 'NOT_SET',
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
  // Webhook setup for Serverless environments (e.g. Vercel / AWS Lambda)
  app.use(bot.webhookCallback('/telegram-webhook'));
  bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}/telegram-webhook`);
  console.log(`Webhook set to ${WEBHOOK_DOMAIN}/telegram-webhook`);
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
