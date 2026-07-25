import express from 'express';
import * as dotenv from 'dotenv';
import { bot } from './telegram';
import { registerBotHandlers } from './botHandlers';
import { ensureUserTable } from './prisma';

import booksRouter from './routes/books';
import groupsRouter from './routes/groups';
import studentsRouter from './routes/students';
import ordersRouter from './routes/orders';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import systemRouter, { webhookLogger } from './routes/system';

dotenv.config();

// Ensure erp_users database table on startup
ensureUserTable();

// Register Telegram Bot command handlers
registerBotHandlers();

const app = express();
app.use(express.json());

// Enable CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    service: 'SmartBook ERP Backend API',
    webhook: '/telegram-webhook',
    endpoints: ['POST /api/orders/smart-create', 'GET /webhook-info', 'GET /webhook-debug', 'GET /backend/books', 'GET /backend/categories']
  });
});

// Telegram Webhook logger
app.all('/telegram-webhook', webhookLogger);

// Mount Modular Express Routers
app.use(booksRouter);
app.use(groupsRouter);
app.use(studentsRouter);
app.use(ordersRouter);
app.use(settingsRouter);
app.use(usersRouter);
app.use(systemRouter);

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

// Listen on port if NOT running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Enable graceful stop (outside Vercel)
if (!process.env.VERCEL) {
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

export default app;
