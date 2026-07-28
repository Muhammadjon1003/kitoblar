import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

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

// PATCH /backend/books/:id — Update book custom price
router.patch('/backend/books/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { price } = req.body;
    if (price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ error: "Sotuv narxi (price) raqam shaklida bo'lishi shart." });
    }

    const updated = await prisma.telegramBook.update({
      where: { id },
      data: { price: Number(price) },
      include: { category: true }
    });

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /backend/books/:id — Hard delete a book record from database catalog
router.delete('/backend/books/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
