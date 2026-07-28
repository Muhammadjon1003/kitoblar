import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('--- Cleaning System/Test Groups ---');
  const sysGroups = await prisma.erpGroup.findMany({
    where: { groupName: 'Ombor Zaxirasi' }
  });

  console.log('Found system groups:', sysGroups);

  for (const g of sysGroups) {
    // Delete orders associated with this group
    await prisma.erpOrder.deleteMany({ where: { groupId: g.id } });
    // Delete students associated with this group
    await prisma.erpStudent.deleteMany({ where: { groupId: g.id } });
    // Delete group
    await prisma.erpGroup.delete({ where: { id: g.id } });
  }

  console.log('System groups cleaned successfully.');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
