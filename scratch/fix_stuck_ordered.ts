import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('--- Checking stuck ORDERED orders ---');
  const stuck = await prisma.erpOrder.findMany({
    where: {
      status: 'ORDERED',
      student: { fullName: { contains: 'Абдусаматова' } }
    },
    include: { student: true }
  });

  console.log('Found stuck orders:', stuck.map(s => ({ id: s.id, student: s.student.fullName, status: s.status })));

  for (const s of stuck) {
    await prisma.erpOrder.update({
      where: { id: s.id },
      data: { status: 'PAID' }
    });
    console.log(`Reset order ${s.id} for ${s.student.fullName} back to PAID.`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
