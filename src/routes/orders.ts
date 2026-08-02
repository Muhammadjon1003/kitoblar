import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { bot, uploadToTelegramChannel, getStaffGroupId, getSupplierGroupId } from '../telegram';
import { createSmartOrder } from '../orderService';
import { cleanBookName } from './books';

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
        ordersToSendTelegram.push(o);
      }
    }

    // Group only remaining orders that were NOT auto-fulfilled from inventory
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

    const supplierGroupId = getSupplierGroupId();
    const staffGroupId = getStaffGroupId();

    // Prepare aggregated summary lists (Full Sets, Individual Sub-books, and Warehouse Stock)
    const fullSetsSupplierMap: Record<string, number> = {};
    const individualSupplierMap: Record<string, number> = {};
    const warehouseItemsMap: Record<string, number> = {};

    for (const item of autoFulfilled) {
      const title = cleanBookName(item.bookName);
      warehouseItemsMap[title] = (warehouseItemsMap[title] || 0) + 1;
    }

    for (const bookId in groups) {
      const group = groups[bookId];
      const N = group.orders.length;
      const bookObj = bookMap.get(bookId);

      if (bookObj?.isSet && bookObj?.setDetails) {
        let files: Array<{ name: string; fileId: string }> = [];
        try { files = JSON.parse(bookObj.setDetails); } catch (e) {}

        const subBookDeficits: Array<{ name: string; fileId: string; needed: number; inStock: number; deficit: number }> = [];

        for (const f of files) {
          const cleanName = cleanBookName(f.name);
          const stock = await prisma.warehouseStock.findFirst({
            where: { fileId: f.fileId, quantity: { gt: 0 } }
          });
          const availableStock = stock ? stock.quantity : 0;
          const fromStock = Math.min(availableStock, N);
          const deficit = N - fromStock;

          subBookDeficits.push({
            name: cleanName,
            fileId: f.fileId,
            needed: N,
            inStock: fromStock,
            deficit: deficit
          });
        }

        // Complete sets to order from supplier:
        const fullSetsToOrder = Math.min(...subBookDeficits.map(d => d.deficit));
        if (fullSetsToOrder > 0) {
          const setName = cleanBookName(bookObj.name);
          fullSetsSupplierMap[setName] = (fullSetsSupplierMap[setName] || 0) + fullSetsToOrder;
        }

        // Remaining individual sub-books & warehouse stock
        for (const d of subBookDeficits) {
          const remainingDeficit = d.deficit - fullSetsToOrder;
          if (remainingDeficit > 0) {
            individualSupplierMap[d.name] = (individualSupplierMap[d.name] || 0) + remainingDeficit;
          }
          if (d.inStock > 0) {
            warehouseItemsMap[d.name] = (warehouseItemsMap[d.name] || 0) + d.inStock;
          }
        }
      } else {
        const cleanName = cleanBookName(group.bookName);
        individualSupplierMap[cleanName] = (individualSupplierMap[cleanName] || 0) + N;
      }
    }

    // 1. Send the text breakdown summary to STAFF_GROUP_ID for internal staff
    if (staffGroupId) {
      let summaryText = `🚚 <b>YETKAZILISHI KERAK BO'LGAN DARSLIKLAR VA KOMPLEKTLAR RO'YXATI</b>\n\n`;

      const fullSetEntries = Object.entries(fullSetsSupplierMap);
      if (fullSetEntries.length > 0) {
        summaryText += `📦 <b>To'liq Komplektlar (Ta'minotchidan):</b>\n`;
        fullSetEntries.forEach(([title, qty]) => {
          summaryText += `• ${title} - ${qty}ta to'liq to'plam\n`;
        });
        summaryText += `\n`;
      }

      const individualEntries = Object.entries(individualSupplierMap);
      if (individualEntries.length > 0) {
        summaryText += `📖 <b>Alohida Darsliklar (Ta'minotchidan dona-dona):</b>\n`;
        individualEntries.forEach(([title, qty]) => {
          summaryText += `• ${title} - ${qty}ta\n`;
        });
        summaryText += `\n`;
      }

      const warehouseEntries = Object.entries(warehouseItemsMap);
      if (warehouseEntries.length > 0) {
        summaryText += `🏢 <b>Ombor zaxirasidan (Ombordan biriktirildi):</b>\n`;
        warehouseEntries.forEach(([title, qty]) => {
          summaryText += `• ${title} - ${qty}ta\n`;
        });
      }

      try {
        await bot.telegram.sendMessage(staffGroupId, summaryText, { parse_mode: 'HTML' });
      } catch (err: any) {
        console.warn('[Staff Group Summary Error]:', err.message);
      }
    }

    // 2. Send PDF document files to SUPPLIER_GROUP_ID for supplier printing
    const targetPDFChatId = supplierGroupId || staffGroupId;

    const sentResults = [];
    if (targetPDFChatId && ordersToSendTelegram.length > 0) {
      for (const bookId in groups) {
        const group = groups[bookId];
        const studentNames = group.orders.map(o => o.student.fullName);
        const caption = `kitob nomi: ${group.bookName}\nSoni: ${studentNames.length}\nKimlar uchun:\n${studentNames.join('\n')}`;

        try {
          const bookObj = bookMap.get(bookId);
          let primaryMsgId = 0;
          let subBookFulfillmentInfo = '';

          if (bookObj?.isSet && bookObj?.setDetails) {
            let files: Array<{ name: string; fileId: string }> = [];
            try { files = JSON.parse(bookObj.setDetails); } catch (e) {}

            const subBookRequirements: Array<{ name: string; neededFromSupplier: number; fromStock: number }> = [];

            // Reserve warehouse stock & calculate exact needed count for each sub-book
            for (const f of files) {
              const cleanName = cleanBookName(f.name);
              const stock = await prisma.warehouseStock.findFirst({
                where: { fileId: f.fileId, quantity: { gt: 0 } }
              });
              const available = stock ? stock.quantity : 0;
              const fromStock = Math.min(available, studentNames.length);
              const neededFromSupplier = studentNames.length - fromStock;

              if (stock && fromStock > 0) {
                await prisma.warehouseStock.update({
                  where: { id: stock.id },
                  data: { quantity: stock.quantity - fromStock }
                });
              }

              subBookRequirements.push({
                name: cleanName,
                neededFromSupplier,
                fromStock
              });
            }

            const subBookListStr = subBookRequirements.map(r => {
              if (r.neededFromSupplier > 0) {
                return `• <b>${r.name}</b>: <b>${r.neededFromSupplier} ta</b> (🖨 Chop etilishi kerak)`;
              } else {
                return `• <b>${r.name}</b>: 0 ta (❌ Chop etilmasin — omborda bor)`;
              }
            }).join('\n');

            const setCaption = `📦 <b>Komplekt Nomi:</b> ${group.bookName} (Jami ${studentNames.length} ta talaba uchun)\n\n` +
              `📋 <b>Darsliklar bo'yicha ehtiyoj:</b>\n${subBookListStr}\n\n` +
              `👥 <b>Kimlar uchun:</b>\n${studentNames.join('\n')}`;

            // Attach ALL PDF files of the set into the media group
            const mediaGroup = files.map((f, index) => ({
              type: 'document' as const,
              media: f.fileId,
              caption: index === files.length - 1 ? setCaption : undefined
            }));

            const sentMsgs = await bot.telegram.sendMediaGroup(targetPDFChatId, mediaGroup);
            primaryMsgId = sentMsgs[0]?.message_id || 0;
            subBookFulfillmentInfo = JSON.stringify(subBookRequirements);
          } else {
            const sentMsg = await bot.telegram.sendDocument(targetPDFChatId, group.tgFileId, { caption });
            primaryMsgId = sentMsg.message_id;
          }

          // Mark orders as ORDERED AFTER Telegram dispatch succeeds
          for (const o of group.orders) {
            await prisma.erpOrder.update({
              where: { id: o.id },
              data: {
                status: 'ORDERED',
                fulfilledSetDetails: subBookFulfillmentInfo || undefined,
                updatedAt: today
              }
            });

            try {
              await prisma.dispatchedOrderLog.create({
                data: {
                  studentName: o.student?.fullName ?? 'Talaba',
                  groupName: o.group?.groupName ?? '—',
                  teacherName: o.group?.teacherName ?? '',
                  bookTitle: group.bookName,
                  orderedAt: today,
                }
              });
            } catch (logErr) {
              console.warn('[DispatchedOrderLog Error]:', logErr);
            }
          }

          sentResults.push({ bookId, bookName: group.bookName, success: true, messageId: primaryMsgId });
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
