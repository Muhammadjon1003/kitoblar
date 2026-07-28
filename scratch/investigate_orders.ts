import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('=== INVESTIGATING ORDERS FOR RAYXONA AND MADINA ===');
  
  const students = await prisma.erpStudent.findMany({
    where: {
      fullName: {
        contains: 'Rayxona',
        mode: 'insensitive'
      }
    }
  });

  const studentsMadina = await prisma.erpStudent.findMany({
    where: {
      fullName: {
        contains: 'Madina',
        mode: 'insensitive'
      }
    }
  });

  console.log('Students Rayxona:', students);
  console.log('Students Madina:', studentsMadina);

  const studentIds = [...students.map(s => s.id), ...studentsMadina.map(s => s.id)];

  const orders = await prisma.erpOrder.findMany({
    where: {
      studentId: { in: studentIds }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('=== ORDERS FOUND ===');
  console.log(JSON.stringify(orders, null, 2));

  const allRecentOrders = await prisma.erpOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });

  console.log('=== 15 RECENT ORDERS IN SYSTEM ===');
  for (const o of allRecentOrders) {
    const student = await prisma.erpStudent.findUnique({ where: { id: o.studentId } });
    const book = await prisma.telegramBook.findUnique({ where: { id: parseInt(o.bookId) } }).catch(() => null);
    console.log(`Order ID: ${o.id} | Student: ${student?.fullName} | Book: ${book?.name || o.bookId} | Status: ${o.status} | Updated: ${o.updatedAt}`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
