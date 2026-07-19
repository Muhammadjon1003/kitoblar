import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create a Student with nested Financials
  const studentAlice = await prisma.student.create({
    data: {
      name: 'Jasur Bek',
      totalLessonsAttended: 12,
      currentDebt: 50.0,
      debtLimit: 150.0,
      status: 'ACTIVE',
      financials: {
        create: {
          totalPrice: 200.0,
          paidAmount: 150.0,
          remainingBalance: 50.0,
        }
      }
    }
  });

  const studentBob = await prisma.student.create({
    data: {
      name: 'Sardor',
      totalLessonsAttended: 3,
      currentDebt: 0.0,
      debtLimit: 100.0,
      status: 'ACTIVE',
    }
  });

  // 2. Create Books (One assigned to Alice, one unassigned in stock)
  const mathBook = await prisma.book.create({
    data: {
      title: 'Advanced Math',
      teacherId: 101,
      tgFileId: 'BQACAgIAAxkBAAE...Math12',
      status: 'DELIVERED',
      studentId: studentAlice.id, // Assigned to Alice
    }
  });

  const physicsBook = await prisma.book.create({
    data: {
      title: 'Physics 101',
      teacherId: 102,
      tgFileId: 'BQACAgIAAxkBAAE...Phys01',
      status: 'IN_STOCK',
      studentId: null, // Unassigned
    }
  });

  // 3. Create an Order Record for the assigned book
  await prisma.order.create({
    data: {
      studentId: studentAlice.id,
      bookId: mathBook.id,
      logisticsStatus: 'ARRIVED',
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
