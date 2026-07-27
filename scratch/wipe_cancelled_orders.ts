import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('Connecting to database...');
  
  // 1. Delete all CANCELLED orders
  const deletedOrders = await prisma.erpOrder.deleteMany({
    where: {
      status: 'CANCELLED',
    },
  });
  console.log(`Deleted ${deletedOrders.count} CANCELLED orders.`);

  // 2. Also check if there are manual inventory entries or RETURNED orders that are test data
  const returnedOrders = await prisma.erpOrder.deleteMany({
    where: {
      status: 'RETURNED',
    },
  });
  console.log(`Deleted ${returnedOrders.count} RETURNED orders.`);
}

main()
  .catch(err => {
    console.error('Error during wipe:', err);
  })
  .finally(() => prisma.$disconnect());
