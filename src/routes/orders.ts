import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { bot, uploadToTelegramChannel, getStaffGroupId, getSupplierGroupId, formatChatId } from '../telegram';
import { createSmartOrder } from '../orderService';
import { cleanBookName } from './books';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /backend/orders — fetch all orders, newest first
router.get('/backend/orders', async (req, res) => {
  try {
    const orders = await prisma.erpOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: true,
        group: true,
      }
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
      createdAt: o.createdAt,
      student: o.student,
      group: o.group,
      studentName: o.student?.fullName || '',
      groupName: o.group?.groupName || '',
      teacherName: o.group?.teacherName || '',
      fulfilledSetDetails: o.fulfilledSetDetails,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/inventory/manual & /backend/inventory/manual-add — Add unassigned physical books manually to warehouse stock
const handleManualInventoryAdd = async (req: any, res: any) => {
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
};

router.post('/backend/inventory/manual', handleManualInventoryAdd);
router.post('/backend/inventory/manual-add', handleManualInventoryAdd);

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

    const createdIds = created.map(c => c.id);
    const fetchCreated = await prisma.erpOrder.findMany({
      where: { id: { in: createdIds } },
      include: { student: true, group: true }
    });

    res.status(201).json(fetchCreated.map(o => ({
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
      createdAt: o.createdAt,
      student: o.student,
      group: o.group,
      studentName: o.student?.fullName || '',
      groupName: o.group?.groupName || '',
      teacherName: o.group?.teacherName || '',
      fulfilledSetDetails: o.fulfilledSetDetails,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /backend/orders/:id — partial update: status, amountPaid, amountPaidDelta, bookCost, sotuvNarxi, comment, bookId, isCoursePaid
router.patch('/backend/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amountPaid, amountPaidDelta, bookCost, sotuvNarxi, comment, bookId, isCoursePaid } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const existing = await prisma.erpOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    let finalAmountPaid = existing.amountPaid;
    if (amountPaid !== undefined) {
      finalAmountPaid = Number(amountPaid);
    } else if (amountPaidDelta !== undefined) {
      finalAmountPaid = Math.max(0, existing.amountPaid + Number(amountPaidDelta));
    }

    let finalSotuvNarxi = sotuvNarxi !== undefined ? Number(sotuvNarxi) : existing.sotuvNarxi;
    if (isCoursePaid) {
      finalSotuvNarxi = 0;
    }

    let finalStatus = status !== undefined ? status : existing.status;

    // Automatic state transition: CREATED -> PAID when payment requirement is satisfied
    if (existing.status === 'CREATED' && status === undefined) {
      if (finalSotuvNarxi > 0 && finalAmountPaid >= finalSotuvNarxi) {
        finalStatus = 'PAID';
      }
    }

    const updated = await prisma.erpOrder.update({
      where: { id },
      data: {
        status: finalStatus,
        amountPaid: finalAmountPaid,
        sotuvNarxi: finalSotuvNarxi,
        ...(bookCost   !== undefined && { bookCost: Number(bookCost) }),
        ...(comment    !== undefined && { comment }),
        ...(bookId     !== undefined && { bookId: String(bookId) }),
        updatedAt: today,
      },
      include: {
        student: true,
        group: true,
      }
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
      createdAt: updated.createdAt,
      student: updated.student,
      group: updated.group,
      studentName: updated.student?.fullName || '',
      groupName: updated.group?.groupName || '',
      teacherName: updated.group?.teacherName || '',
      fulfilledSetDetails: updated.fulfilledSetDetails,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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

// POST /backend/orders/bulk-status — update status for multiple orders
router.post('/backend/orders/bulk-status', async (req, res) => {
  try {
    const { orderIds, status, comment } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required.' });
    }
    const today = new Date().toISOString().slice(0, 10);

    const updated = await prisma.erpOrder.updateMany({
      where: { id: { in: orderIds } },
      data: {
        ...(status && { status }),
        ...(comment && { comment }),
        updatedAt: today,
      }
    });

    res.json({ success: true, count: updated.count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/orders/:id/return-stock — decoupled returned book to warehouse stock
router.post('/backend/orders/:id/return-stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const order = await prisma.erpOrder.findUnique({
      where: { id },
      include: { student: true, group: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = await prisma.erpOrder.update({
      where: { id },
      data: {
        status: 'RETURNED',
        comment: comment ? `Omborga qaytarildi: ${comment}` : "Omborga qaytarilgan darslik",
        updatedAt: today,
      },
      include: { student: true, group: true }
    });

    res.json({ success: true, order: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/orders/send-telegram & /backend/send-to-telegram — send selected orders to Telegram
export const handleSendTelegram = async (req: any, res: any) => {
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

    const today = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const autoFulfilled: Array<{ orderId: string; studentName: string; bookName: string }> = [];
    const ordersToSendTelegram: typeof orders = [];

    // Check inventory for matching unassigned physical books (RETURNED status in warehouse)
    for (const o of orders) {
      const book = bookMap.get(o.bookId);
      const bookName = book?.name || 'Kitob';

      const stockOrder = await prisma.erpOrder.findFirst({
        where: {
          bookId: o.bookId,
          status: 'RETURNED',
          id: { not: o.id }
        }
      });

      if (stockOrder) {
        await prisma.erpOrder.update({
          where: { id: o.id },
          data: {
            status: 'ARRIVED',
            comment: "Omborda mavjud bo'lgani uchun avtomatik biriktirildi",
            updatedAt: today,
          }
        });

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
        ordersToSendTelegram.push(o);
      }
    }

    const groups: Record<string, { bookName: string; tgFileId: string; orders: typeof orders }> = {};
    for (const o of ordersToSendTelegram) {
      const book = bookMap.get(o.bookId);
      if (!book) continue;
      if (!groups[o.bookId]) {
        groups[o.bookId] = {
          bookName: book.name,
          tgFileId: book.tgFileId,
          orders: [],
        };
      }
      groups[o.bookId].orders.push(o);
    }

    const dbSettings = await prisma.erpSettings.findUnique({ where: { id: 'global' } }).catch(() => null);
    const dbStaffGroupId = dbSettings?.staffGroupId ? formatChatId(dbSettings.staffGroupId) : '';
    const staffTargetGroupId = dbStaffGroupId || getStaffGroupId() || getSupplierGroupId();
    const supplierGroupId   = dbStaffGroupId || getSupplierGroupId() || getStaffGroupId();

    if (staffTargetGroupId) {
      let summaryText = `🚚 <b>YETKAZILISHI KERAK BO'LGAN DARSLIKLAR VA KOMPLEKTLAR RO'YXATI</b>\n\n`;
      let plainSummaryText = `🚚 YETKAZILISHI KERAK BO'LGAN DARSLIKLAR VA KOMPLEKTLAR RO'YXATI\n\n`;

      const fullSetsSupplierMap: Record<string, number> = {};
      const individualSupplierMap: Record<string, number> = {};
      const warehouseItemsMap: Record<string, number> = {};

      for (const item of autoFulfilled) {
        const title = cleanBookName(item.bookName);
        warehouseItemsMap[title] = (warehouseItemsMap[title] || 0) + 1;
      }

      for (const [bookId, group] of Object.entries(groups)) {
        const N = group.orders.length;
        const bookObj = bookMap.get(bookId);

        if (bookObj?.isSet && bookObj?.setDetails) {
          const setName = cleanBookName(bookObj.name);
          fullSetsSupplierMap[setName] = (fullSetsSupplierMap[setName] || 0) + N;
        } else {
          const cleanName = cleanBookName(group.bookName);
          individualSupplierMap[cleanName] = (individualSupplierMap[cleanName] || 0) + N;
        }
      }

      const fullSetEntries = Object.entries(fullSetsSupplierMap);
      if (fullSetEntries.length > 0) {
        summaryText += `📦 <b>To'liq Komplektlar (Ta'minotchidan):</b>\n`;
        plainSummaryText += `📦 To'liq Komplektlar (Ta'minotchidan):\n`;
        fullSetEntries.forEach(([title, qty]) => {
          summaryText += `• ${escapeHtml(title)} - ${qty} ta to'liq to'plam\n`;
          plainSummaryText += `• ${title} - ${qty} ta to'liq to'plam\n`;
        });
        summaryText += `\n`;
        plainSummaryText += `\n`;
      }

      const individualEntries = Object.entries(individualSupplierMap);
      if (individualEntries.length > 0) {
        summaryText += `📖 <b>Alohida Darsliklar (Ta'minotchidan):</b>\n`;
        plainSummaryText += `📖 Alohida Darsliklar (Ta'minotchidan):\n`;
        individualEntries.forEach(([title, qty]) => {
          summaryText += `• ${escapeHtml(title)} - ${qty} ta\n`;
          plainSummaryText += `• ${title} - ${qty} ta\n`;
        });
        summaryText += `\n`;
        plainSummaryText += `\n`;
      }

      const warehouseEntries = Object.entries(warehouseItemsMap);
      if (warehouseEntries.length > 0) {
        summaryText += `🏢 <b>Ombor zaxirasidan biriktirilgan:</b>\n`;
        plainSummaryText += `🏢 Ombor zaxirasidan biriktirilgan:\n`;
        warehouseEntries.forEach(([title, qty]) => {
          summaryText += `• ${escapeHtml(title)} - ${qty} ta\n`;
          plainSummaryText += `• ${title} - ${qty} ta\n`;
        });
      }

      try {
        await bot.telegram.sendMessage(staffTargetGroupId, summaryText, { parse_mode: 'HTML' });
      } catch (err: any) {
        console.warn('[Staff Group Summary HTML Error, retrying plain text]:', err.message);
        await bot.telegram.sendMessage(staffTargetGroupId, plainSummaryText).catch(e => {
          console.error('[Staff Group Summary Fatal Error]:', e.message);
        });
      }
    }
    const sentResults = [];

    for (const [bookId, group] of Object.entries(groups)) {
      const studentNamesList = group.orders.map(o => o.student.fullName);
      const studentNames = studentNamesList.join(', ');
      const bookObj = bookMap.get(bookId);

      if (supplierGroupId) {
        try {
          if (bookObj?.setDetails) {
            let files: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];
            try { files = JSON.parse(bookObj.setDetails); } catch (e) {}

            if (Array.isArray(files) && files.length > 0) {
              if (bookObj.tgFileId && !files.some(f => f.fileId === bookObj.tgFileId)) {
                files.unshift({
                  name: cleanBookName(bookObj.name),
                  fileId: bookObj.tgFileId,
                  isMain: true,
                  fileType: 'MAIN'
                });
              }

              const mainFiles = files.filter(f => f.isMain !== false && f.fileType !== 'COVER' && f.fileType !== 'SUPPLEMENT');
              const compFiles = files.filter(f => f.isMain === false || f.fileType === 'COVER' || f.fileType === 'SUPPLEMENT');

              const orderedFiles: Array<{ name: string; fileId: string; isMain?: boolean; fileType?: string; parentFileId?: string }> = [];

              for (const mf of mainFiles) {
                orderedFiles.push(mf);
                const supplements = compFiles.filter(cf => cf.parentFileId === mf.fileId || cf.parentFileId === mf.name);
                orderedFiles.push(...supplements);
              }
              const unattachedCompFiles = compFiles.filter(cf => !orderedFiles.some(of => of.fileId === cf.fileId));
              orderedFiles.push(...unattachedCompFiles);

              const mainBooksStr = (mainFiles.length > 0 ? mainFiles : files).map((mf, idx) => {
                const cleanMfName = cleanBookName(mf.name);
                const supplements = compFiles.filter(cf => cf.parentFileId === mf.fileId || cf.parentFileId === mf.name);
                let line = `${idx + 1}. ${cleanMfName}`;
                if (supplements.length > 0) {
                  const suppNames = supplements.map(s => cleanBookName(s.name)).join(', ');
                  line += `\n   Ilovalar: ${suppNames}`;
                }
                return line;
              }).join('\n');

              const setCaption = `📦 <b>${bookObj.isSet ? "Komplekt Nomi" : "Darslik Nomi"}:</b> ${cleanBookName(group.bookName)} - ${studentNamesList.length} ta buyurtma\n\n` +
                `📚 <b>Darsliklar va Ilovalar: (${orderedFiles.length} ta fayl)</b>\n${mainBooksStr}\n\n` +
                `👥 <b>Kimlar uchun:</b>\n${studentNamesList.join('\n')}`;

              const targetFiles = orderedFiles.length > 0 ? orderedFiles : files;
              if (targetFiles.length > 1) {
                const mediaGroup = targetFiles.map((f, index) => ({
                  type: 'document' as const,
                  media: f.fileId,
                  caption: index === targetFiles.length - 1 ? setCaption : undefined,
                  parse_mode: 'HTML' as const
                }));

                await bot.telegram.sendMediaGroup(supplierGroupId, mediaGroup);
              } else {
                const caption = `📦 <b>Darslik Buyurtmasi:</b> ${group.bookName}\n👥 <b>Talabalar:</b> ${studentNames}\n📊 <b>Soni:</b> ${group.orders.length} ta`;
                await bot.telegram.sendDocument(supplierGroupId, targetFiles[0]?.fileId || group.tgFileId, { caption, parse_mode: 'HTML' });
              }
            } else {
              const caption = `📦 <b>Darslik Buyurtmasi:</b> ${group.bookName}\n👥 <b>Talabalar:</b> ${studentNames}\n📊 <b>Soni:</b> ${group.orders.length} ta`;
              await bot.telegram.sendDocument(supplierGroupId, group.tgFileId, { caption, parse_mode: 'HTML' });
            }
          } else {
            const caption = `📦 <b>Darslik Buyurtmasi:</b> ${group.bookName}\n👥 <b>Talabalar:</b> ${studentNames}\n📊 <b>Soni:</b> ${group.orders.length} ta`;
            await bot.telegram.sendDocument(supplierGroupId, group.tgFileId, { caption, parse_mode: 'HTML' });
          }
          sentResults.push({ bookId, bookName: group.bookName, success: true });
        } catch (e: any) {
          console.warn('[Supplier Telegram Post Warning]:', e.message);
          sentResults.push({ bookId, bookName: group.bookName, success: false, error: e.message });
        }
      }

      await prisma.erpOrder.updateMany({
        where: { id: { in: group.orders.map(o => o.id) } },
        data: {
          status: 'ORDERED',
          updatedAt: today,
        }
      });

      // Log to dispatched_order_logs
      for (const o of group.orders) {
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const orderCreatedDateStr = `${y}-${m}-${day} ${h}:${min}`;

        await prisma.dispatchedOrderLog.create({
          data: {
            studentName: o.student.fullName,
            groupName: o.group.groupName,
            teacherName: o.group.teacherName,
            bookTitle: group.bookName,
            orderedAt: today,
            orderCreatedAt: orderCreatedDateStr,
          }
        }).catch(() => {});
      }
    }

    res.json({
      success: true,
      autoFulfilledCount: autoFulfilled.length,
      dispatchedCount: ordersToSendTelegram.length,
      autoFulfilled,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

router.post('/backend/orders/send-telegram', handleSendTelegram);
router.post('/backend/send-to-telegram', handleSendTelegram);
// GET /backend/orders/dispatched-history — Immutable permanent log of supplier dispatches
router.get('/backend/orders/dispatched-history', async (req, res) => {
  try {
    let logs = await prisma.dispatchedOrderLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const erpOrders = await prisma.erpOrder.findMany({
      include: { student: true, group: true }
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
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const createdDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        await prisma.dispatchedOrderLog.create({
          data: {
            studentName: o.student.fullName,
            groupName: o.group.groupName,
            teacherName: o.group.teacherName ?? '',
            bookTitle: bookMap.get(o.bookId) ?? 'Darslik',
            orderedAt: o.updatedAt || new Date().toISOString().slice(0, 10),
            orderCreatedAt: createdDateStr,
          }
        });
      }

      logs = await prisma.dispatchedOrderLog.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    // Format log entries dynamically resolving real erp_orders createdAt if missing
    const formattedLogs = logs.map(l => {
      let teacherCreatedAt = l.orderCreatedAt && l.orderCreatedAt.trim() !== '' ? l.orderCreatedAt : '';

      if (!teacherCreatedAt || teacherCreatedAt === l.orderedAt) {
        const matched = erpOrders.find(o =>
          o.student?.fullName === l.studentName &&
          o.group?.groupName === l.groupName
        );
        if (matched?.createdAt) {
          const d = new Date(matched.createdAt);
          teacherCreatedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }

      return {
        ...l,
        orderCreatedAt: teacherCreatedAt || l.orderedAt
      };
    });

    res.json(formattedLogs);
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
