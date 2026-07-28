import { bot } from '../src/telegram';

const chatId = '-1004440998978';
const messageId = 272;
const newCaption = `kitob nomi: Математика для юных талантов, часть 1\nSoni: 2\nKimlar uchun:\nНаримонов Умар 2- синф 291\nНормуродова Нигина 3 кллас, 2...`;

async function main() {
  console.log(`Editing message ${messageId} in chat ${chatId}...`);
  try {
    await bot.telegram.editMessageCaption(chatId, messageId, undefined, newCaption);
    console.log(`🎉 SUCCESS! Edited message ${messageId} in chat ${chatId}`);
  } catch (err: any) {
    console.error('Failed to edit caption:', err.message);
  }
}

main();
