import { PrismaClient } from '@prisma/client';
import { bot } from './telegram';

const prisma = new PrismaClient();

// The group ID where notifications will be sent (e.g., -1001234567890)
const STAFF_GROUP_ID = process.env.STAFF_GROUP_ID || '';

/**
 * Phase 2: Automated PO with TG Links
 * Aggregates orders and generates temporary Telegram direct download links.
 */
export async function generatePOBatch(orderIds: number[]) {
  // 1. Fetch all requested orders with their associated book and student data
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      book: true,
      student: true,
    }
  });

  const poBatch = [];

  // 2. Generate direct download links dynamically using the Telegram Bot API
  for (const order of orders) {
    if (order.book && order.book.tgFileId) {
      try {
        // getFileLink returns a URL valid for ~1 hour directly to the Telegram CDN
        const fileUrl = await bot.telegram.getFileLink(order.book.tgFileId);
        
        poBatch.push({
          orderId: order.id,
          studentName: order.student.name,
          bookTitle: order.book.title,
          downloadLink: fileUrl.toString()
        });
      } catch (error) {
        console.error(`Failed to generate link for tg_file_id: ${order.book.tgFileId}`, error);
      }
    }
  }

  // 3. Mark orders as PROCESSING
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { logisticsStatus: 'PROCESSING' }
  });

  return poBatch;
}

/**
 * Phase 3: Group Synchronization Xabar
 * Marks an order as ARRIVED and sends a beautifully formatted notification.
 */
export async function markBookAsArrived(orderId: number, groupName: string) {
  // 1. Update the order and fetch necessary relations
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { logisticsStatus: 'ARRIVED' },
    include: {
      student: true,
      book: true,
    }
  });

  if (!order || !order.book) throw new Error("Order or Book not found");

  // Also update the Book status to ARRIVED
  await prisma.book.update({
    where: { id: order.bookId },
    data: { status: 'ARRIVED' }
  });

  // 2. Generate Beautiful HTML/Markdown Message
  // Using HTML parsing mode for clean, structured formatting
  const messageHtml = `
📦 <b>New Book Arrived!</b>

👨‍🎓 <b>Student:</b> ${order.student.name}
🏫 <b>Group:</b> ${groupName}
👨‍🏫 <b>Teacher ID:</b> ${order.book.teacherId}
📖 <b>Book Title:</b> <i>${order.book.title}</i>

✅ The book is now ready for delivery/pickup.
  `;

  // 3. Broadcast to the Staff Group
  if (STAFF_GROUP_ID) {
    await bot.telegram.sendMessage(STAFF_GROUP_ID, messageHtml, {
      parse_mode: 'HTML'
    });
  } else {
    console.warn("STAFF_GROUP_ID is not set in environment variables!");
  }

  return order;
}
