import { Router } from 'express';
import { prisma } from '../prisma';
import { bot, STORAGE_CHANNEL_ID } from '../telegram';

const router = Router();

// Helper: Auto-sync storage channel message caption
async function syncStorageChannel(bookId: number) {
  try {
    const book = await prisma.telegramBook.findUnique({
      where: { id: bookId },
      include: { category: true }
    });
    if (!book || !book.tgMessageId) return;

    const categoryName = book.category ? book.category.name : 'Umumiy';
    if (book.isSet && book.setDetails) {
      const files: Array<{ name: string; fileId: string }> = JSON.parse(book.setDetails);
      const fileListStr = files.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
      const caption = `🆔 ID: ${book.id}\n📦 Nomi: ${book.name}\n📂 Kategoriya: ${categoryName}\n\n📚 Tarkibidagi darsliklar (${files.length} ta):\n${fileListStr}`;
      await bot.telegram.editMessageCaption(STORAGE_CHANNEL_ID, book.tgMessageId, undefined, caption);
    } else {
      const caption = `🆔 ID: ${book.id}\n📖 Nomi: ${book.name}\n📂 Kategoriya: ${categoryName}`;
      await bot.telegram.editMessageCaption(STORAGE_CHANNEL_ID, book.tgMessageId, undefined, caption);
    }
  } catch (e: any) {
    console.warn('[Storage Channel Sync Warning]:', e.message);
  }
}

// GET /backend/books — Fetch all uploaded books (with optional categoryId filter)
router.get('/backend/books', async (req, res) => {
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

// PATCH /backend/books/:id — Update book name, price, setDetails, or categoryId
router.patch('/backend/books/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price, setDetails, categoryId, isSet } = req.body;
    
    const updateData: any = {};
    if (price !== undefined && !isNaN(Number(price))) updateData.price = Number(price);
    if (name !== undefined && typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (setDetails !== undefined) updateData.setDetails = typeof setDetails === 'string' ? setDetails : JSON.stringify(setDetails);
    if (categoryId !== undefined && !isNaN(Number(categoryId))) updateData.categoryId = Number(categoryId);
    if (isSet !== undefined) updateData.isSet = Boolean(isSet);

    const updated = await prisma.telegramBook.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });

    await syncStorageChannel(updated.id);

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /backend/books/:id — Hard delete a book record from database catalog and storage channel
router.delete('/backend/books/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const book = await prisma.telegramBook.findUnique({ where: { id } });
    if (book && book.tgMessageId) {
      try {
        await bot.telegram.deleteMessage(STORAGE_CHANNEL_ID, book.tgMessageId);
      } catch (e: any) {
        console.warn('[Storage Channel Delete Warning]:', e.message);
      }
    }

    const deleted = await prisma.telegramBook.delete({ where: { id } });
    res.json({ message: "Kitob o'chirildi", deleted });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /backend/categories — Fetch all book categories
router.get('/backend/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
