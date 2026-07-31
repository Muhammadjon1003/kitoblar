import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

export function formatChatId(id: string | number): string | number {
  if (typeof id === 'number') return id;
  const str = String(id).trim();
  if (!str) return str;
  if (str.startsWith('@') || str.startsWith('-')) return str;
  if (str.length >= 10) return `-100${str}`;
  return `-${str}`;
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const bot = new Telegraf(BOT_TOKEN);

/**
 * Dynamic resolution of Staff Group ID:
 * 1. Checks ErpSettings table in PostgreSQL (DB override)
 * 2. Checks process.env.STAFF_GROUP_ID
 * 3. Throws descriptive error if neither is configured.
 */
export async function getStaffGroupId(): Promise<string> {
  // 1. DB Override
  try {
    const dbSettings = await prisma.erpSettings.findUnique({ where: { id: 'global' } });
    if (dbSettings?.staffGroupId && dbSettings.staffGroupId.trim()) {
      return String(formatChatId(dbSettings.staffGroupId));
    }
  } catch (e) {}

  // 2. Env variable
  if (process.env.STAFF_GROUP_ID && process.env.STAFF_GROUP_ID.trim()) {
    return String(formatChatId(process.env.STAFF_GROUP_ID));
  }

  throw new Error("STAFF_GROUP_ID is not configured. Please set STAFF_GROUP_ID in Vercel Environment Variables or SuperAdmin Console.");
}

/**
 * Dynamic resolution of Storage Channel ID:
 * 1. Checks ErpSettings table in PostgreSQL (DB override)
 * 2. Checks process.env.STORAGE_CHANNEL_ID
 */
export async function getStorageChannelId(): Promise<string> {
  try {
    const dbSettings = await prisma.erpSettings.findUnique({ where: { id: 'global' } });
    if (dbSettings?.storageChannelId && dbSettings.storageChannelId.trim()) {
      return String(formatChatId(dbSettings.storageChannelId));
    }
  } catch (e) {}

  if (process.env.STORAGE_CHANNEL_ID && process.env.STORAGE_CHANNEL_ID.trim()) {
    return String(formatChatId(process.env.STORAGE_CHANNEL_ID));
  }

  throw new Error("STORAGE_CHANNEL_ID is not configured. Please set STORAGE_CHANNEL_ID in Vercel Environment Variables or SuperAdmin Console.");
}

// Backward compatibility static fallbacks for botHandlers background startup
export const STORAGE_CHANNEL_ID = formatChatId(process.env.STORAGE_CHANNEL_ID || '');
export const STAFF_GROUP_ID = formatChatId(process.env.STAFF_GROUP_ID || '');

/**
 * Uploads a file buffer directly to Telegram to save disk space.
 */
export async function uploadToTelegramChannel(
  fileBuffer: Buffer, 
  fileName: string
): Promise<string> {
  const channelId = await getStorageChannelId();
  const message = await bot.telegram.sendDocument(channelId, {
    source: fileBuffer,
    filename: fileName,
  });

  return message.document.file_id;
}
