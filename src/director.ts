import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Assume an average cost per book if not tracked in the schema yet
const AVG_BOOK_COST = 50.0; 
const AVG_BOOK_SIZE_MB = 25;

export async function getDirectorMetrics() {
  // 1. "Dead Capital Tracker": Sum of 'IN_STOCK' books (unassigned capital)
  const deadCapitalCount = await prisma.book.count({
    where: { status: 'IN_STOCK' }
  });
  const deadCapitalValue = deadCapitalCount * AVG_BOOK_COST;

  // 2. "Server Storage Savings Metric": GB Saved from Telegram CDN
  const totalBooksCount = await prisma.book.count({
    where: { tgFileId: { not: '' } } // or simply all books
  });
  const savedMegabytes = totalBooksCount * AVG_BOOK_SIZE_MB;
  const savedGigabytes = (savedMegabytes / 1024).toFixed(2);

  // 3. "Group Coverage Grid": Aggregation (Rows: Students, Columns: Book Status)
  // We fetch students with their orders/books to map on the frontend
  const coverageData = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      books: {
        select: {
          title: true,
          status: true,
        }
      },
      orders: {
        select: {
          book: { select: { title: true } },
          logisticsStatus: true
        }
      }
    }
  });

  return {
    deadCapitalValue,
    savedGigabytes,
    coverageData
  };
}
