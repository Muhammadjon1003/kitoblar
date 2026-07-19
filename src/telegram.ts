import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
export const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID || '@your_storage_channel';

// Initialize the Telegram Bot
export const bot = new Telegraf(BOT_TOKEN);

/**
 * Uploads a file buffer directly to Telegram to save disk space (0GB local storage).
 * The file is sent to a private channel, and we capture the tg_file_id.
 */
export async function uploadToTelegramChannel(
  fileBuffer: Buffer, 
  fileName: string
): Promise<string> {
  const message = await bot.telegram.sendDocument(STORAGE_CHANNEL_ID, {
    source: fileBuffer,
    filename: fileName,
  });

  // Return ONLY the string ID for the database
  return message.document.file_id;
}
