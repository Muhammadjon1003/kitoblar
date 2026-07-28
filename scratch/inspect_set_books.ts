import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('--- Inspecting TelegramBooks ---');
  const books = await prisma.telegramBook.findMany({
    where: { isSet: true },
    include: { category: true }
  });

  console.log(JSON.stringify(books, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
