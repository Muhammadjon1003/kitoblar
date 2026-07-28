import { bot, STAFF_GROUP_ID } from '../src/telegram';

async function main() {
  console.log(`Sending test message to STAFF_GROUP_ID: ${STAFF_GROUP_ID}...`);
  try {
    const res = await bot.telegram.sendMessage(
      STAFF_GROUP_ID,
      `🧪 <b>[SmartBooks Test xabari]</b>\n\n` +
      `Assalomu alaykum! Ushbu xabar Telegram guruh sozlamalarini (STAFF_GROUP_ID) sinovdan o'tkazish uchun yuborildi.\n\n` +
      `✅ Bot xodimlar guruhida muvaffaqiyatli ishlamoqda!\n` +
      `🕒 Vaqt: ${new Date().toLocaleString('uz-UZ')}`,
      { parse_mode: 'HTML' }
    );
    console.log('✅ Test message sent successfully! Message ID:', res.message_id);
  } catch (err: any) {
    console.error('❌ Failed to send message:', err.message);
  }
}

main();
