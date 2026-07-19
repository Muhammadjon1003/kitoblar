import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createSmartOrder(
  studentId: number, 
  title: string, 
  teacherId: number, 
  tgFileId: string, 
  adminOverride: boolean = false
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Automated Restrictions
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error("Student not found");

    // Block logic unless Manual Override is activated
    if (!adminOverride) {
      if (student.totalLessonsAttended < 5) {
        throw new Error("Order Blocked: Student has attended fewer than 5 lessons.");
      }
      if (student.currentDebt > student.debtLimit) {
        throw new Error("Order Frozen: Current debt exceeds the debt limit.");
      }
    }

    // 2. Warehouse Scanner: Scan for existing 'IN_STOCK' books of the same title
    let assignedBook = await tx.book.findFirst({
      where: {
        title: title,
        status: 'IN_STOCK'
      }
    });

    // 3. Reusable Asset Allocation
    let reusedAsset = false;
    if (assignedBook) {
      // Re-use existing asset (ignore the newly uploaded tgFileId or use it elsewhere)
      assignedBook = await tx.book.update({
        where: { id: assignedBook.id },
        data: {
          studentId: student.id,
          status: 'ORDERED'
        }
      });
      reusedAsset = true;
    } else {
      // Create new asset using the newly uploaded file from Telegram
      assignedBook = await tx.book.create({
        data: {
          title: title,
          teacherId: teacherId,
          tgFileId: tgFileId,
          status: 'ORDERED',
          studentId: student.id
        }
      });
    }

    // 4. Create Final Order
    const order = await tx.order.create({
      data: {
        studentId: student.id,
        bookId: assignedBook.id,
        logisticsStatus: 'PENDING'
      }
    });

    return { order, book: assignedBook, reusedAsset };
  });
}
