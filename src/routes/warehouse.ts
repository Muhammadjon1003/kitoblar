import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /backend/warehouse-stock — Fetch all individual sub-book stock items in physical warehouse
router.get('/backend/warehouse-stock', async (req, res) => {
  try {
    const stockItems = await prisma.warehouseStock.findMany({
      orderBy: { quantity: 'desc' }
    });
    res.json(stockItems);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/warehouse-stock/return — Handle full or partial book returns from students
router.post('/backend/warehouse-stock/return', async (req, res) => {
  try {
    const { orderId, returnedFileIds, comment } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "orderId parametr kiritilishi shart." });
    }

    const order = await prisma.erpOrder.findUnique({
      where: { id: orderId },
      include: { student: true, group: true }
    });

    if (!order) {
      return res.status(404).json({ error: "Buyurtma topilmadi." });
    }

    const book = await prisma.telegramBook.findUnique({
      where: { id: parseInt(order.bookId) }
    });

    const todayStr = new Date().toISOString();
    const returnLogs: string[] = [];

    // Case A: Set book partial/full return
    if (book && book.isSet && book.setDetails) {
      let files: Array<{ name: string; fileId: string }> = [];
      try { files = JSON.parse(book.setDetails); } catch (e) {}

      const filesToReturn = Array.isArray(returnedFileIds) && returnedFileIds.length > 0
        ? files.filter(f => returnedFileIds.includes(f.fileId))
        : files; // Default to all if not specified

      for (const item of filesToReturn) {
        await prisma.warehouseStock.upsert({
          where: { fileId: item.fileId },
          update: { quantity: { increment: 1 } },
          create: { fileId: item.fileId, title: item.name, quantity: 1 }
        });
        returnLogs.push(item.name);
      }
    } 
    // Case B: Single book return
    else if (book) {
      await prisma.warehouseStock.upsert({
        where: { fileId: book.tgFileId },
        update: { quantity: { increment: 1 } },
        create: { fileId: book.tgFileId, title: book.name, quantity: 1 }
      });
      returnLogs.push(book.name);
    }

    const returnSummary = returnLogs.length > 0 
      ? `Omborga qaytarilgan darsliklar (${returnLogs.length} ta): ${returnLogs.join(', ')}`
      : 'Qaytarildi';

    const updatedOrder = await prisma.erpOrder.update({
      where: { id: orderId },
      data: {
        status: 'RETURNED',
        comment: comment ? `${comment} | ${returnSummary}` : returnSummary,
        updatedAt: todayStr,
      }
    });

    res.json({
      success: true,
      message: `${returnLogs.length} ta darslik ombor zaxirasiga muvaffaqiyatli qaytarildi.`,
      returnedBooks: returnLogs,
      order: updatedOrder
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/warehouse-stock/add — Add unassigned physical books or sub-books of a set directly to warehouse
router.post('/backend/warehouse-stock/add', async (req, res) => {
  try {
    const { bookId, selectedFileIds, quantity, bookCost, comment } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: "bookId parametr kiritilishi shart." });
    }

    const qtyToAdd = Math.max(1, parseInt(String(quantity || 1)));

    const book = await prisma.telegramBook.findUnique({
      where: { id: parseInt(String(bookId)) }
    });

    if (!book) {
      return res.status(404).json({ error: "Darslik topilmadi." });
    }

    const addedLogs: string[] = [];

    // Case A: Set book sub-items addition
    if (book.isSet && book.setDetails) {
      let files: Array<{ name: string; fileId: string }> = [];
      try { files = JSON.parse(book.setDetails); } catch (e) {}

      const filesToAdd = Array.isArray(selectedFileIds) && selectedFileIds.length > 0
        ? files.filter(f => selectedFileIds.includes(f.fileId))
        : files;

      for (const item of filesToAdd) {
        await prisma.warehouseStock.upsert({
          where: { fileId: item.fileId },
          update: { quantity: { increment: qtyToAdd } },
          create: { fileId: item.fileId, title: item.name, quantity: qtyToAdd }
        });
        addedLogs.push(`${item.name} (${qtyToAdd} ta)`);
      }
    } 
    // Case B: Single book addition
    else {
      await prisma.warehouseStock.upsert({
        where: { fileId: book.tgFileId },
        update: { quantity: { increment: qtyToAdd } },
        create: { fileId: book.tgFileId, title: book.name, quantity: qtyToAdd }
      });
      addedLogs.push(`${book.name} (${qtyToAdd} ta)`);
    }

    res.json({
      success: true,
      message: `${addedLogs.length} turdagi darslik ombor zaxirasiga qo'shildi.`,
      addedItems: addedLogs
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/warehouse-stock/remove — Delete/write off damaged physical books from warehouse stock
router.post('/backend/warehouse-stock/remove', async (req, res) => {
  try {
    const { stockId, quantity, reason } = req.body;
    if (!stockId) {
      return res.status(400).json({ error: "stockId parametr kiritilishi shart." });
    }

    const qtyToRemove = Math.max(1, parseInt(String(quantity || 1)));
    const stock = await prisma.warehouseStock.findUnique({
      where: { id: parseInt(String(stockId)) }
    });

    if (!stock) {
      return res.status(404).json({ error: "Ombor zaxirasi topilmadi." });
    }

    const newQty = Math.max(0, stock.quantity - qtyToRemove);
    if (newQty === 0) {
      await prisma.warehouseStock.delete({ where: { id: stock.id } });
    } else {
      await prisma.warehouseStock.update({
        where: { id: stock.id },
        data: { quantity: newQty }
      });
    }

    res.json({
      success: true,
      message: `"${stock.title}" kitobidan ${qtyToRemove} ta yaroqsiz deb ombordan o'chirildi.`,
      newQuantity: newQty,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
