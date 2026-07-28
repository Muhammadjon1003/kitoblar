import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('--- Inspecting all ORDERED orders in DB ---');
  const orderedList = await prisma.erpOrder.findMany({
    where: { status: 'ORDERED' },
    include: { student: true, group: true }
  });

  console.log('Current ORDERED list:', JSON.stringify(orderedList, null, 2));

  // Reset all current ORDERED orders back to PAID so logistics can dispatch them cleanly
  const resetCount = await prisma.erpOrder.updateMany({
    where: { status: 'ORDERED' },
    data: { status: 'PAID' }
  });

  console.log(`Successfully reset ${resetCount.count} stuck ORDERED orders back to PAID status!`);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
