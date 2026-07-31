import { bot, STAFF_GROUP_ID } from '../src/telegram';

async function main() {
  console.log('=== SENDING TEST MESSAGE TO STAFF GROUP ===');
  console.log('STAFF_GROUP_ID from env/formatChatId:', STAFF_GROUP_ID);

  try {
    const message = await bot.telegram.sendMessage(
      STAFF_GROUP_ID,
      `✅ <b>SmartBook ERP Test Xabari!</b>\n\n` +
      `📌 Telegram Xodimlar Guruhi (STAFF_GROUP_ID) muvaffaqiyatli sozlandi va ishlamoqda!\n` +
      `⏰ Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>`,
      { parse_mode: 'HTML' }
    );

    console.log(`🎉 SUCCESS! Message sent to Staff Group. Message ID: ${message.message_id}`);
  } catch (err: any) {
    console.error(`❌ FAILED to send message to Staff Group (${STAFF_GROUP_ID}):`, err.message);
  }
}

main();
