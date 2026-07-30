import { bot, STORAGE_CHANNEL_ID } from '../src/telegram';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=30',
    },
  },
});

async function main() {
  console.log('=== RETRYING UN-POSTED BOOKS TO STORAGE CHANNEL ===');

  const unpostedBooks = await prisma.telegramBook.findMany({
    where: { tgMessageId: 0 },
    include: { category: true },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${unpostedBooks.length} un-posted books in database.`);

  for (const b of unpostedBooks) {
    const categoryName = b.category ? b.category.name : 'Umumiy';
    console.log(`\nProcessing Book ID ${b.id}: "${b.name}"...`);

    if (b.isSet && b.setDetails) {
      try {
        const files: Array<{ name: string; fileId: string }> = JSON.parse(b.setDetails);
        const fileListStr = files.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
        const caption = `🆔 ID: ${b.id}\n📦 Nomi: ${b.name}\n📂 Kategoriya: ${categoryName}\n\n📚 Tarkibidagi darsliklar (${files.length} ta):\n${fileListStr}`;

        const mediaGroup = files.map((f, index) => ({
          type: 'document' as const,
          media: f.fileId,
          caption: index === files.length - 1 ? caption : undefined,
        }));

        const msgs = await bot.telegram.sendMediaGroup(STORAGE_CHANNEL_ID, mediaGroup);
        const primaryMsgId = msgs[0]?.message_id || 0;

        await prisma.telegramBook.update({
          where: { id: b.id },
          data: { tgMessageId: primaryMsgId }
        });

        console.log(`✅ Posted Set Book ID ${b.id} to channel. Message ID: ${primaryMsgId}`);
      } catch (e: any) {
        console.error(`Failed to post Set Book ID ${b.id}:`, e.message);
      }
    } else {
      try {
        const caption = `🆔 ID: ${b.id}\n📖 Nomi: ${b.name}\n📂 Kategoriya: ${categoryName}`;
        const msg = await bot.telegram.sendDocument(STORAGE_CHANNEL_ID, b.tgFileId, {
          caption: caption
        });

        await prisma.telegramBook.update({
          where: { id: b.id },
          data: { tgMessageId: msg.message_id }
        });

        console.log(`✅ Posted Single Book ID ${b.id} to channel. Message ID: ${msg.message_id}`);
      } catch (e: any) {
        console.error(`Failed to post Single Book ID ${b.id}:`, e.message);
      }
    }

    await new Promise(r => setTimeout(r, 2500));
  }

  console.log('\n=== RETRY SYNC COMPLETE ===');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
