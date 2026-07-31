import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DATABASE_URL!.replace('-pooler', '') + '&connect_timeout=30';
console.log('Connecting to DB via:', directUrl);

const prisma = new PrismaClient({
  datasources: {
    db: { url: directUrl }
  }
});

async function main() {
  await prisma.$connect();
  console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
}

main()
  .catch(err => console.error('❌ CONNECTION ERROR:', err))
  .finally(() => prisma.$disconnect());
