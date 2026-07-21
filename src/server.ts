import express from 'express';
import multer from 'multer';
import { bot, uploadToTelegramChannel } from './telegram';
import { registerBotHandlers } from './botHandlers';
import { createSmartOrder } from './orderService';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();

const prisma = new PrismaClient();

// Register all Telegram Bot commands, document uploads, and FSM handlers
registerBotHandlers();

const app = express();
app.use(express.json());

// Enable CORS middleware (allows frontend to call backend on different Vercel domains)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
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
    endpoints: ['POST /api/orders/smart-create', 'GET /webhook-info', 'GET /webhook-debug', 'GET /backend/books', 'GET /backend/categories']
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

// ── ERP: Groups ──────────────────────────────────────────────────────────────

// GET /backend/groups — fetch all groups, map to frontend Group shape
app.get('/backend/groups', async (req, res) => {
  try {
    const groups = await prisma.erpGroup.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { students: true } } }
    });
    res.json(groups.map(g => ({
      id: g.id,
      groupName: g.groupName,
      teacherName: g.teacherName,
      subjectCategory: g.subjectCategory,
      startDate: g.startDate,
      endDate: g.endDate,
      orderIntervalDays: g.orderIntervalDays,
      createdAt: g.createdAt.toISOString().slice(0, 10),
      studentCount: g._count.students,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/groups — create a new group
app.post('/backend/groups', async (req, res) => {
  try {
    const { groupName, teacherName, subjectCategory, startDate, endDate, orderIntervalDays } = req.body;
    if (!groupName || !teacherName) {
      return res.status(400).json({ error: 'groupName and teacherName are required.' });
    }
    const group = await prisma.erpGroup.create({
      data: {
        groupName,
        teacherName,
        subjectCategory: subjectCategory ?? '',
        startDate: startDate ?? '',
        endDate: endDate ?? '',
        orderIntervalDays: orderIntervalDays ?? 30,
      }
    });
    res.status(201).json({
      id: group.id,
      groupName: group.groupName,
      teacherName: group.teacherName,
      subjectCategory: group.subjectCategory,
      startDate: group.startDate,
      endDate: group.endDate,
      orderIntervalDays: group.orderIntervalDays,
      createdAt: group.createdAt.toISOString().slice(0, 10),
      studentCount: 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ERP: Students ─────────────────────────────────────────────────────────────

// GET /backend/students — fetch all students (optionally filter by groupId)
app.get('/backend/students', async (req, res) => {
  try {
    const { groupId } = req.query;
    const where: any = {};
    if (groupId) where.groupId = groupId as string;
    const students = await prisma.erpStudent.findMany({
      where,
      orderBy: { joinedAt: 'asc' },
      include: { group: { select: { groupName: true } } }
    });
    res.json(students.map(s => ({
      id: s.id,
      fullName: s.fullName,
      phoneNumber: s.phoneNumber,
      groupId: s.groupId,
      groupName: s.group.groupName,
      joinedAt: s.joinedAt.toISOString().slice(0, 10),
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/students — enroll a new student into a group
app.post('/backend/students', async (req, res) => {
  try {
    const { fullName, phoneNumber, groupId } = req.body;
    if (!fullName || !groupId) {
      return res.status(400).json({ error: 'fullName and groupId are required.' });
    }
    // Verify group exists
    const group = await prisma.erpGroup.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const student = await prisma.erpStudent.create({
      data: { fullName, phoneNumber: phoneNumber ?? '', groupId }
    });
    res.status(201).json({
      id: student.id,
      fullName: student.fullName,
      phoneNumber: student.phoneNumber,
      groupId: student.groupId,
      groupName: group.groupName,
      joinedAt: student.joinedAt.toISOString().slice(0, 10),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ── ERP: Orders ───────────────────────────────────────────────────────────────

// GET /backend/orders — fetch all orders, newest first
app.get('/backend/orders', async (req, res) => {
  try {
    const orders = await prisma.erpOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(o => ({
      id: o.id,
      studentId: o.studentId,
      groupId: o.groupId,
      bookId: o.bookId,
      status: o.status,
      amountPaid: o.amountPaid,
      bookCost: o.bookCost,
      sotuvNarxi: o.sotuvNarxi,
      comment: o.comment,
      updatedAt: o.updatedAt,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/orders — create one or many orders, auto-locks current sotuvNarxi
app.post('/backend/orders', async (req, res) => {
  try {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const today = new Date().toISOString().slice(0, 10);

    // Fetch current selling price from settings
    let currentSotuvNarxi = 0;
    try {
      const settings = await prisma.erpSettings.upsert({
        where: { id: 'global' },
        update: {},
        create: { id: 'global', sotuvNarxi: 0 },
      });
      currentSotuvNarxi = settings.sotuvNarxi;
    } catch (_) { /* keep 0 if settings table not ready */ }

    const created = await Promise.all(body.map((item: any) => {
      const { studentId, groupId, bookId, bookCost, comment } = item;
      if (!studentId || !groupId || !bookId) {
        throw new Error('studentId, groupId, and bookId are required per item.');
      }
      return prisma.erpOrder.create({
        data: {
          studentId,
          groupId,
          bookId,
          status: 'CREATED',
          amountPaid: 0,
          bookCost: bookCost ?? 0,
          sotuvNarxi: currentSotuvNarxi,   // locked at creation time
          comment: comment ?? '',
          updatedAt: today,
        },
      });
    }));

    res.status(201).json(created.map(o => ({
      id: o.id,
      studentId: o.studentId,
      groupId: o.groupId,
      bookId: o.bookId,
      status: o.status,
      amountPaid: o.amountPaid,
      bookCost: o.bookCost,
      sotuvNarxi: o.sotuvNarxi,
      comment: o.comment,
      updatedAt: o.updatedAt,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /backend/orders/:id — partial update: status, amountPaid, bookCost, sotuvNarxi, comment
app.patch('/backend/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amountPaid, bookCost, sotuvNarxi, comment } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const updated = await prisma.erpOrder.update({
      where: { id },
      data: {
        ...(status     !== undefined && { status }),
        ...(amountPaid !== undefined && { amountPaid }),
        ...(bookCost   !== undefined && { bookCost }),
        ...(sotuvNarxi !== undefined && { sotuvNarxi }),
        ...(comment    !== undefined && { comment }),
        updatedAt: today,
      },
    });

    res.json({
      id: updated.id,
      studentId: updated.studentId,
      groupId: updated.groupId,
      bookId: updated.bookId,
      status: updated.status,
      amountPaid: updated.amountPaid,
      bookCost: updated.bookCost,
      sotuvNarxi: updated.sotuvNarxi,
      comment: updated.comment,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

// DELETE /backend/orders/:id — hard-delete (cancel) an order
app.delete('/backend/orders/:id', async (req, res) => {
  try {
    await prisma.erpOrder.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});


// ── ERP: Settings ──────────────────────────────────────────────────────────────

// GET /backend/settings — return global settings, creating defaults if needed
app.get('/backend/settings', async (req, res) => {
  try {
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', sotuvNarxi: 0 },
    });
    res.json({ sotuvNarxi: settings.sotuvNarxi, updatedAt: settings.updatedAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /backend/settings — manager updates the active selling price
app.patch('/backend/settings', async (req, res) => {
  try {
    const { sotuvNarxi } = req.body;
    if (sotuvNarxi === undefined || isNaN(Number(sotuvNarxi))) {
      return res.status(400).json({ error: 'sotuvNarxi (number) is required.' });
    }
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: { sotuvNarxi: Number(sotuvNarxi) },
      create: { id: 'global', sotuvNarxi: Number(sotuvNarxi) },
    });
    res.json({ sotuvNarxi: settings.sotuvNarxi, updatedAt: settings.updatedAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/orders/send-telegram — send selected orders grouped by book to Telegram channel/group
// POST /backend/orders/send-telegram — send selected orders grouped by book to Telegram channel/group
app.post('/backend/orders/send-telegram', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required.' });
    }

    const orders = await prisma.erpOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        student: true,
      }
    });

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No orders found matching the IDs.' });
    }

    const bookIds = Array.from(new Set(orders.map(o => parseInt(o.bookId)).filter(id => !isNaN(id))));
    const books = await prisma.telegramBook.findMany({
      where: { id: { in: bookIds } }
    });
    const bookMap = new Map(books.map(b => [String(b.id), b]));

    const today = new Date().toISOString().slice(0, 10);
    const autoFulfilled: Array<{ orderId: string; studentName: string; bookName: string }> = [];
    const ordersToSendTelegram: typeof orders = [];

    // Check inventory for matching unassigned physical books (CANCELLED or RETURNED status)
    for (const o of orders) {
      const book = bookMap.get(o.bookId);
      const bookName = book?.name || 'Kitob';

      const stockOrder = await prisma.erpOrder.findFirst({
        where: {
          bookId: o.bookId,
          status: { in: ['CANCELLED', 'RETURNED'] },
          id: { not: o.id }
        }
      });

      if (stockOrder) {
        // Auto-fulfill: assign existing inventory book directly to student (moves to ARRIVED at 0 cost)
        await prisma.erpOrder.update({
          where: { id: o.id },
          data: {
            status: 'ARRIVED',
            comment: "Omborda mavjud bo'lgani uchun avtomatik biriktirildi",
            updatedAt: today,
          }
        });

        // Consume the stock order by marking its status as Ombordan biriktirildi
        await prisma.erpOrder.update({
          where: { id: stockOrder.id },
          data: {
            status: 'Ombordan biriktirildi',
            comment: `Ombordan biriktirildi → ${o.student.fullName}`,
            updatedAt: today,
          }
        });

        autoFulfilled.push({
          orderId: o.id,
          studentName: o.student.fullName,
          bookName,
        });
      } else {
        // If not in inventory stock, mark order as ORDERED and prepare for Telegram
        await prisma.erpOrder.update({
          where: { id: o.id },
          data: {
            status: 'ORDERED',
            updatedAt: today,
          }
        });
        ordersToSendTelegram.push(o);
      }
    }

    // Group only remaining orders that were NOT auto-fulfilled from inventory
    const groups: Record<string, { bookName: string; tgFileId: string; students: string[] }> = {};
    for (const o of ordersToSendTelegram) {
      const book = bookMap.get(o.bookId);
      if (!book) continue;
      if (!groups[o.bookId]) {
        groups[o.bookId] = {
          bookName: book.name,
          tgFileId: book.tgFileId,
          students: [],
        };
      }
      groups[o.bookId].students.push(o.student.fullName);
    }

    let targetChatId = process.env.STAFF_GROUP_ID || process.env.STORAGE_CHANNEL_ID || '';
    if (targetChatId && !targetChatId.startsWith('@') && !targetChatId.startsWith('-')) {
      if (targetChatId.length >= 10) {
        targetChatId = `-100${targetChatId}`;
      } else {
        targetChatId = `-${targetChatId}`;
      }
    }

    const sentResults = [];
    if (targetChatId && ordersToSendTelegram.length > 0) {
      for (const bookId in groups) {
        const group = groups[bookId];
        const caption = `kitob nomi: ${group.bookName}\nSoni: ${group.students.length}\nKimlar uchun:\n${group.students.join('\n')}`;

        try {
          const msg = await bot.telegram.sendDocument(targetChatId, group.tgFileId, {
            caption: caption
          });
          sentResults.push({ bookId, bookName: group.bookName, success: true, messageId: msg.message_id });
        } catch (err: any) {
          console.error(`Failed to send document for book ${group.bookName}:`, err);
          sentResults.push({ bookId, bookName: group.bookName, success: false, error: err.message });
        }
      }
    }

    res.json({
      success: true,
      autoFulfilledCount: autoFulfilled.length,
      autoFulfilled,
      results: sentResults,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
