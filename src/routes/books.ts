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

// Helper to strip any legacy '[Komplekt]' or '📦 ' prefixes from book names
export function cleanBookName(rawName: string): string {
  if (!rawName) return '';
  return rawName.replace(/^(\s*📦\s*|\[Komplekt\]\s*)+/gi, '').trim();
}

// Helper to generate UTF-8 BOM CSV buffer of all books
export function generateBooksCSVBuffer(books: any[]): Buffer {
  const headers = ['ID', 'Kategoriya', 'Darslik Nomi', 'Darslik Turi', 'Sotuv Narxi (som)'];
  const rows: string[][] = [headers];

  for (const b of books) {
    const catName = b.category ? b.category.name : 'Umumiy';
    const price = b.price || 0;

    if (b.isSet && b.setDetails) {
      try {
        const files: Array<{ name: string }> = JSON.parse(b.setDetails);
        for (const f of files) {
          const cleanName = cleanBookName(f.name);
          if (cleanName) {
            rows.push([
              String(b.id),
              `"${catName.replace(/"/g, '""')}"`,
              `"${cleanName.replace(/"/g, '""')}"`,
              '"Komplekt Darsligi"',
              String(price)
            ]);
          }
        }
      } catch (e) {
        const cleanName = cleanBookName(b.name);
        rows.push([
          String(b.id),
          `"${catName.replace(/"/g, '""')}"`,
          `"${cleanName.replace(/"/g, '""')}"`,
          '"Alohida Darslik"',
          String(price)
        ]);
      }
    } else {
      const cleanName = cleanBookName(b.name);
      rows.push([
        String(b.id),
        `"${catName.replace(/"/g, '""')}"`,
        `"${cleanName.replace(/"/g, '""')}"`,
        '"Alohida Darslik"',
        String(price)
      ]);
    }
  }

  const csvContent = rows.map(r => r.join(',')).join('\r\n');
  return Buffer.from('\uFEFF' + csvContent, 'utf-8');
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

    // Auto-clean any legacy '[Komplekt]' or '📦 ' prefixes from existing DB records
    for (const b of books) {
      const cleaned = cleanBookName(b.name);
      if (cleaned !== b.name) {
        await prisma.telegramBook.update({
          where: { id: b.id },
          data: { name: cleaned }
        }).catch(() => {});
        b.name = cleaned;
      }
    }

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
    if (name !== undefined && typeof name === 'string' && name.trim()) updateData.name = cleanBookName(name);
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

// GET /backend/books/export-csv — Download full books catalog as CSV file
router.get('/backend/books/export-csv', async (req, res) => {
  try {
    const books = await prisma.telegramBook.findMany({
      include: { category: true },
      orderBy: [
        { categoryId: 'asc' },
        { id: 'asc' }
      ]
    });

    const csvBuffer = generateBooksCSVBuffer(books);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Darsliklar_Royxati_SmartBook.csv"');
    res.send(csvBuffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
