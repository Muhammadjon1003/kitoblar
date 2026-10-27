import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { cleanBookName } from './books';

const router = Router();

// Middleware: API Key Authentication
function requireExternalApiKey(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.EXTERNAL_API_KEY;
  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!configuredKey) {
    console.warn('[External API Warning]: EXTERNAL_API_KEY is not configured in .env');
    return res.status(500).json({
      error: 'EXTERNAL_API_KEY is not configured on the server. Please define EXTERNAL_API_KEY in .env.'
    });
  }

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing X-API-Key'
    });
  }

  next();
}

/**
 * GET /api/v1/students-books
 * 
 * Read-only endpoint for external projects.
 * Returns only which student has which book:
 * - currentBook: latest book handed over to the student (status = 'GIVEN')
 * - pastBooks: prior books handed over to the student (status = 'GIVEN')
 * 
 * Strict data privacy: no phone numbers, no finances, no debts, no Telegram data.
 */
router.get('/api/v1/students-books', requireExternalApiKey, async (req: Request, res: Response) => {
  try {
    const { studentId, search, includeEmpty } = req.query;

    const whereClause: any = {};
    if (studentId) {
      whereClause.id = String(studentId);
    }
    if (search) {
      whereClause.fullName = { contains: String(search), mode: 'insensitive' };
    }

    // 1. Fetch students and only orders that have been 'GIVEN'
    const students = await prisma.erpStudent.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        orders: {
          where: {
            status: 'GIVEN'
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            bookId: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // 2. Collect unique bookIds to fetch their clean names in one query
    const bookIdNumbers = Array.from(
      new Set(
        students
          .flatMap(s => s.orders.map(o => parseInt(o.bookId)))
          .filter(id => !isNaN(id))
      )
    );

    const books = await prisma.telegramBook.findMany({
      where: {
        id: { in: bookIdNumbers }
      },
      select: {
        id: true,
        name: true
      }
    });

    const bookMap = new Map<string, string>();
    for (const b of books) {
      bookMap.set(String(b.id), cleanBookName(b.name));
    }

    // 3. Format the response strictly scoped to current and past books
    const result = students
      .map(student => {
        const givenBooks = student.orders.map(order => ({
          bookId: order.bookId,
          bookTitle: bookMap.get(String(order.bookId)) || `Book #${order.bookId}`,
          assignedDate: order.createdAt
            ? order.createdAt.toISOString().slice(0, 10)
            : (order.updatedAt ? order.updatedAt.slice(0, 10) : null)
        }));

        const currentBook = givenBooks.length > 0 ? givenBooks[0] : null;
        const pastBooks = givenBooks.length > 1 ? givenBooks.slice(1) : [];

        return {
          studentId: student.id,
          studentName: student.fullName,
          currentBook,
          pastBooks
        };
      })
      .filter(item => {
        // By default only include students who currently have / have had a given book
        if (includeEmpty === 'true' || includeEmpty === '1') {
          return true;
        }
        return item.currentBook !== null;
      });

    res.json(result);
  } catch (error: any) {
    console.error('[External API Error]:', error);
    res.status(500).json({ error: 'Internal server error while fetching student books.' });
  }
});

export default router;
