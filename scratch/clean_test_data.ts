import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Current Orders ---');
  const orders = await prisma.erpOrder.findMany({
    include: { student: true }
  });
  console.log(JSON.stringify(orders, null, 2));

  console.log('--- Current Inventory/Books ---');
  const books = await prisma.telegramBook.findMany();
  console.log(JSON.stringify(books, null, 2));
}

main().finally(() => prisma.$disconnect());
