import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ==================================================
 * PHASE 4: Dynamic Balance Tracker
 * Manages partial payments and recalculates the dynamic remaining balance.
 * ==================================================
 */
export async function addPayment(studentId: number, amountPaid: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current financials
    let financials = await tx.financials.findUnique({
      where: { studentId: studentId }
    });

    if (!financials) {
      // Create default financials if they don't exist
      financials = await tx.financials.create({
        data: {
          studentId: studentId,
          totalPrice: 0,
          paidAmount: 0,
          remainingBalance: 0
        }
      });
    }

    // 2. Add new payment and recalculate dynamically
    const newPaidAmount = financials.paidAmount + amountPaid;
    // ensure no floating point bugs by parsing to fixed decimals if needed
    let remainingBalance = financials.totalPrice - newPaidAmount;
    if (remainingBalance < 0) remainingBalance = 0; // Prevent negative debt if they overpay

    // 3. Update the record
    const updatedFinancials = await tx.financials.update({
      where: { id: financials.id },
      data: {
        paidAmount: newPaidAmount,
        remainingBalance: remainingBalance
      }
    });

    // 4. Also adjust the student's global debt limit logic if applicable
    await tx.student.update({
      where: { id: studentId },
      data: { currentDebt: remainingBalance }
    });

    return updatedFinancials;
  });
}

/**
 * ==================================================
 * PHASE 4.5: Locked Delivery Guard (Kitobni Topshirish)
 * Strictly blocks delivery unless Remaining Balance is exactly 0.
 * ==================================================
 */
export async function deliverBook(orderId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch order with nested financials
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        student: {
          include: { financials: true }
        },
        book: true
      }
    });

    if (!order || !order.book) throw new Error("Order not found");

    const remainingBalance = order.student.financials?.remainingBalance || 0;

    // 2. Strict Delivery Guard
    if (remainingBalance > 0) {
      throw new Error(
        `Delivery Locked: Student ${order.student.name} still owes ${remainingBalance}. ` +
        `The [Deliver Book] button must be disabled on the UI.`
      );
    }

    // 3. Mark delivery successful
    const updatedBook = await tx.book.update({
      where: { id: order.bookId },
      data: { status: 'DELIVERED' }
    });

    return updatedBook;
  });
}

/**
 * ==================================================
 * PHASE 5: Asset Return System
 * Unbinds a book from a leaving student, leaving the Telegram file entirely intact.
 * ==================================================
 */
export async function returnAssetToWarehouse(studentId: number) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Find all books currently assigned to the departing student
    const assignedBooks = await tx.book.findMany({
      where: { studentId: studentId }
    });

    // 2. Decouple the student and revert status to 'IN_STOCK'
    // The tgFileId remains strictly intact natively.
    const updatedBooks = await tx.book.updateMany({
      where: { studentId: studentId },
      data: {
        studentId: null,   // Clears assignment
        status: 'IN_STOCK' // Back to warehouse pool
      }
    });

    // 3. Freeze the student's account
    const student = await tx.student.update({
      where: { id: studentId },
      data: { status: 'FROZEN' }
    });

    return {
      studentId: student.id,
      booksReturned: updatedBooks.count,
      freedBooks: assignedBooks.map(b => b.title)
    };
  });
}
