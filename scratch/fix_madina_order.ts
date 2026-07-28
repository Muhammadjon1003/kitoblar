import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log("=== FIXING MADINA RUSTAMOVA'S ORDER STATUS ===");

  const updatedMadina = await prisma.erpOrder.update({
    where: { id: 'cms5089fz0001s3vjt053rp8x' },
    data: {
      status: 'ORDERED',
      comment: '',
      updatedAt: '2026-07-28',
    }
  });

  console.log('✅ Madina order reset to ORDERED:', updatedMadina);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
