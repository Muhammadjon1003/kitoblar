import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('=== CHECKING AND UPDATING ADMIN.DEV USER ROLE ===');

  const users = await prisma.erpUser.findMany();
  console.log('Registered Users in DB:');
  for (const u of users) {
    console.log(`- ID: ${u.id} | Name: ${u.fullName} | Username: "${u.username}" | Role: ${u.role}`);
  }

  // Find admin.dev or admin users
  const adminDev = await prisma.erpUser.findFirst({
    where: {
      username: { in: ['admin.dev', 'admin', 'superadmin'] }
    }
  });

  if (adminDev) {
    const updated = await prisma.erpUser.update({
      where: { id: adminDev.id },
      data: { role: 'SUPER_ADMIN' }
    });
    console.log(`\n✅ Updated user "${updated.username}" to role: SUPER_ADMIN`);
  } else {
    const newAdmin = await prisma.erpUser.create({
      data: {
        fullName: '⚡ Super Admin (Developer)',
        username: 'admin.dev',
        password: 'admin.dev',
        role: 'SUPER_ADMIN',
      }
    });
    console.log(`\n✅ Created new SUPER_ADMIN user "${newAdmin.username}"!`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
