import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('=== CLEANING TEST CANCELLED ORDERS AND WAREHOUSE ITEMS ===');

  // 1. Find cancelled / warehouse stock test orders
  const testOrders = await prisma.erpOrder.findMany({
    where: {
      status: { in: ['CANCELLED', 'Ombordan biriktirildi', 'RETURNED'] }
    }
  });

  console.log(`Found ${testOrders.length} test cancelled/returned/warehouse orders:`);
  for (const o of testOrders) {
    console.log(`- Order ID: ${o.id} | BookId: ${o.bookId} | Status: ${o.status} | Comment: ${o.comment}`);
  }

  // 2. Delete test cancelled/returned orders from erp_orders
  const deleteOrdersResult = await prisma.erpOrder.deleteMany({
    where: {
      status: { in: ['CANCELLED', 'Ombordan biriktirildi', 'RETURNED'] }
    }
  });

  console.log(`✅ Deleted ${deleteOrdersResult.count} test cancelled/returned orders.`);

  // 3. Find Ombor Inventari student or Ombor Zaxirasi group if present
  const omborStudents = await prisma.erpStudent.findMany({
    where: {
      fullName: { contains: 'Ombor', mode: 'insensitive' }
    }
  });

  if (omborStudents.length > 0) {
    console.log('Found Ombor placeholder students:', omborStudents.map(s => s.fullName));
    const deleteStudentOrders = await prisma.erpOrder.deleteMany({
      where: {
        studentId: { in: omborStudents.map(s => s.id) }
      }
    });
    console.log(`Deleted ${deleteStudentOrders.count} orders for placeholder Ombor students.`);
    const deleteStudentsResult = await prisma.erpStudent.deleteMany({
      where: {
        id: { in: omborStudents.map(s => s.id) }
      }
    });
    console.log(`Deleted ${deleteStudentsResult.count} Ombor placeholder students.`);
  }

  console.log('=== CLEANUP COMPLETE ===');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
