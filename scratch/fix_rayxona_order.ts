import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log("=== FIXING RAYXONA'S ORDER STATUS ===");

  // 1. Update O'taniyozova Rayxona's order to ORDERED
  const updatedRayxona = await prisma.erpOrder.update({
    where: { id: 'cms508kf50003s3vjj38gthri' },
    data: {
      status: 'ORDERED',
      comment: '',
      updatedAt: '2026-07-28',
    }
  });

  // 2. Reset the consumed warehouse stock order back to CANCELLED
  const updatedStock = await prisma.erpOrder.update({
    where: { id: 'cms4zx5it0001ssra3jtnm5di' },
    data: {
      status: 'CANCELLED',
      comment: 'Jismoniy darslik omborda',
      updatedAt: '2026-07-28',
    }
  });

  console.log('✅ Rayxona order reset to ORDERED:', updatedRayxona);
  console.log('✅ Warehouse stock restored to CANCELLED:', updatedStock);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
