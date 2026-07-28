import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { bot, uploadToTelegramChannel } from '../telegram';
import { createSmartOrder } from '../orderService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /backend/orders — fetch all orders, newest first
router.get('/backend/orders', async (req, res) => {
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

// POST /backend/inventory/manual — Add unassigned physical books manually to warehouse stock
router.post('/backend/inventory/manual', async (req, res) => {
  try {
    const { bookId, quantity, bookCost, comment } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: "Darslik (bookId) tanlanishi shart." });
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const cost = Math.max(0, parseFloat(bookCost) || 0);
    const today = new Date().toISOString().slice(0, 10);

    // Ensure system group & student exist for unassigned stock
    let systemGroup = await prisma.erpGroup.findFirst({ where: { groupName: "Ombor Zaxirasi" } });
    if (!systemGroup) {
      systemGroup = await prisma.erpGroup.create({
        data: {
          groupName: "Ombor Zaxirasi",
          teacherName: "Omborxona Admin",
          subjectCategory: "Ombor",
          startDate: today,
          endDate: today,
          orderIntervalDays: 0,
        }
      });
    }

    let systemStudent = await prisma.erpStudent.findFirst({ where: { fullName: "Ombor Inventari" } });
    if (!systemStudent) {
      systemStudent = await prisma.erpStudent.create({
        data: {
          fullName: "Ombor Inventari",
          phoneNumber: "",
          groupId: systemGroup.id,
        }
      });
    }

    const createdOrders = [];
    for (let i = 0; i < qty; i++) {
      const order = await prisma.erpOrder.create({
        data: {
          studentId: systemStudent.id,
          groupId: systemGroup.id,
          bookId: String(bookId),
          status: 'RETURNED',
          amountPaid: 0,
          bookCost: cost,
          sotuvNarxi: 0,
          comment: comment ? `Ombor zaxirasi: ${comment}` : "Ombor jismoniy zaxirasi (Qo'lda kiritilgan)",
          updatedAt: today,
        }
      });
      createdOrders.push(order);
    }

    res.status(201).json({
      success: true,
      count: createdOrders.length,
      orders: createdOrders,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/orders — create one or many orders, auto-locks current sotuvNarxi
router.post('/backend/orders', async (req, res) => {
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

    // Pre-fetch books to get custom prices if configured
    const bookIds = Array.from(new Set(body.map((item: any) => parseInt(item.bookId)).filter((id: number) => !isNaN(id))));
    const dbBooks = await prisma.telegramBook.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, price: true }
    });
    const bookPriceMap = new Map(dbBooks.map(b => [String(b.id), b.price ?? 0]));

    const created = await Promise.all(body.map((item: any) => {
      const { studentId, groupId, bookId, bookCost, comment } = item;
      if (!studentId || !groupId || !bookId) {
        throw new Error('studentId, groupId, and bookId are required per item.');
      }

      const customPrice = bookPriceMap.get(String(bookId));
      const finalSotuvNarxi = (customPrice && customPrice > 0) ? customPrice : currentSotuvNarxi;

      return prisma.erpOrder.create({
        data: {
          studentId,
          groupId,
          bookId,
          status: 'CREATED',
          amountPaid: 0,
          bookCost: bookCost ?? 0,
          sotuvNarxi: finalSotuvNarxi,
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

// PATCH /backend/orders/:id — partial update: status, amountPaid, bookCost, sotuvNarxi, comment, bookId
router.patch('/backend/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amountPaid, bookCost, sotuvNarxi, comment, bookId } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const updated = await prisma.erpOrder.update({
      where: { id },
      data: {
        ...(status     !== undefined && { status }),
        ...(amountPaid !== undefined && { amountPaid }),
        ...(bookCost   !== undefined && { bookCost }),
        ...(sotuvNarxi !== undefined && { sotuvNarxi }),
        ...(comment    !== undefined && { comment }),
        ...(bookId     !== undefined && { bookId }),
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
router.delete('/backend/orders/:id', async (req, res) => {
  try {
    await prisma.erpOrder.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

// POST /backend/orders/send-telegram — send selected orders grouped by book to Telegram channel/group
router.post('/backend/orders/send-telegram', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required.' });
    }

    const orders = await prisma.erpOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        student: true,
        group: true,
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

        // Insert permanent log into DispatchedOrderLog safely
        try {
          await prisma.dispatchedOrderLog.create({
            data: {
              studentName: o.student?.fullName ?? 'Talaba',
              groupName: o.group?.groupName ?? '—',
              teacherName: o.group?.teacherName ?? '',
              bookTitle: bookName,
              orderedAt: today,
            }
          });
        } catch (logErr) {
          console.warn('[DispatchedOrderLog Error]:', logErr);
        }

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

    let targetChatId = process.env.STAFF_GROUP_ID || process.env.STORAGE_CHANNEL_ID || '-1002130662251';
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

// GET /backend/orders/dispatched-history — Immutable permanent log of supplier dispatches
router.get('/backend/orders/dispatched-history', async (req, res) => {
  try {
    let logs = await prisma.dispatchedOrderLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Auto-backfill from existing ORDERED/ARRIVED/GIVEN orders if logs table is empty
    if (logs.length === 0) {
      const existingDispatched = await prisma.erpOrder.findMany({
        where: { status: { in: ['ORDERED', 'ARRIVED', 'GIVEN'] } },
        include: { student: true, group: true }
      });

      const books = await prisma.telegramBook.findMany();
      const bookMap = new Map(books.map(b => [String(b.id), b.name]));

      for (const o of existingDispatched) {
        await prisma.dispatchedOrderLog.create({
          data: {
            studentName: o.student.fullName,
            groupName: o.group.groupName,
            teacherName: o.group.teacherName ?? '',
            bookTitle: bookMap.get(o.bookId) ?? 'Darslik',
            orderedAt: o.updatedAt || new Date().toISOString().slice(0, 10),
          }
        });
      }

      logs = await prisma.dispatchedOrderLog.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/orders/smart-create — Serverless File Attachment & Smart Order Endpoint
router.post('/api/orders/smart-create', upload.single('bookFile'), async (req, res) => {
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

// DELETE /backend/orders/cancelled — Delete all cancelled test orders and test warehouse stock
router.delete('/backend/orders/cancelled', async (req, res) => {
  try {
    const deletedCancelled = await prisma.erpOrder.deleteMany({
      where: { status: { in: ['CANCELLED', 'RETURNED'] } }
    });
    res.json({ message: 'Cancelled and test returned orders deleted successfully', count: deletedCancelled.count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
