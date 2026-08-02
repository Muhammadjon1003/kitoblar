import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Bulletproof Telegram Chat ID Formatter
 * Formats any input (4440998978, -4440998978, 1004440998978, -1004440998978, "@channel")
 * into valid Telegram Supergroup/Channel format (-100...)
 */
export function formatChatId(id: string | number | undefined | null): string {
  if (!id) return '';
  const str = String(id).trim().replace(/^['"]|['"]$/g, '');
  if (!str) return '';
  if (str.startsWith('@')) return str;

  // Strip leading minus signs
  const digits = str.replace(/^-+/, '');
  if (!digits) return str;

  // If already starts with 100 and length >= 12 (e.g. 1004440998978 or 1002130662251)
  if (digits.startsWith('100') && digits.length >= 12) {
    return `-${digits}`;
  }

  // Standard supergroup ID (e.g. 4440998978 -> -1004440998978)
  if (digits.length >= 9) {
    return `-100${digits}`;
  }

  return `-${digits}`;
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const bot = new Telegraf(BOT_TOKEN);

/**
 * Directly reads STAFF_GROUP_ID from Vercel environment variables
 */
export function getStaffGroupId(): string {
  const envId = process.env.STAFF_GROUP_ID || process.env.NEXT_PUBLIC_STAFF_GROUP_ID || '';
  return formatChatId(envId);
}

export function getStorageChannelId(): string {
  const envId = process.env.STORAGE_CHANNEL_ID || process.env.NEXT_PUBLIC_STORAGE_CHANNEL_ID || '';
  return formatChatId(envId);
}

export function getSupplierGroupId(): string {
  const envId = process.env.SUPPLIER_GROUP_ID || process.env.NEXT_PUBLIC_SUPPLIER_GROUP_ID || process.env.STAFF_GROUP_ID || '';
  return formatChatId(envId);
}

/**
 * Uploads a file buffer directly to Telegram to save disk space.
 */
export async function uploadToTelegramChannel(
  fileBuffer: Buffer, 
  fileName: string
): Promise<string> {
  const channelId = getStorageChannelId();
  const message = await bot.telegram.sendDocument(channelId, {
    source: fileBuffer,
    filename: fileName,
  });

  return message.document.file_id;
}
