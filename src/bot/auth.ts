import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to check if a Telegram Chat ID is authorized
export async function isTelegramUserAllowed(userId: number | string): Promise<boolean> {
  const strId = String(userId).trim();
  if (!strId) return false;

  // 1. Check environment variable whitelist (ALLOWED_TELEGRAM_IDS)
  const envAllowed = process.env.ALLOWED_TELEGRAM_IDS || '';
  const envList = envAllowed.split(',').map(id => id.trim()).filter(Boolean);

  if (envList.includes(strId)) {
    return true;
  }

  // If no allowed IDs configured anywhere yet, allow initial user so they can set up
  const dbCount = await prisma.allowedTelegramUser.count();
  if (envList.length === 0 && dbCount === 0) {
    // Auto-authorize the first user who sends a message
    await prisma.allowedTelegramUser.create({
      data: { chatId: strId, fullName: 'Owner' }
    }).catch(() => {});
    return true;
  }

  // 2. Check database whitelist
  const dbUser = await prisma.allowedTelegramUser.findUnique({
    where: { chatId: strId }
  });

  return !!dbUser;
}

// Add a Telegram user to database whitelist
export async function allowTelegramUser(chatId: number | string, fullName: string = ''): Promise<boolean> {
  const strId = String(chatId).trim();
  try {
    await prisma.allowedTelegramUser.upsert({
      where: { chatId: strId },
      update: { fullName },
      create: { chatId: strId, fullName }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Remove a Telegram user from database whitelist
export async function revokeTelegramUser(chatId: number | string): Promise<boolean> {
  const strId = String(chatId).trim();
  try {
    await prisma.allowedTelegramUser.delete({
      where: { chatId: strId }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Get list of all allowed Telegram users
export async function getAllowedTelegramUsers() {
  const dbUsers = await prisma.allowedTelegramUser.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  const envAllowed = process.env.ALLOWED_TELEGRAM_IDS || '';
  const envList = envAllowed.split(',').map(id => id.trim()).filter(Boolean);

  return {
    dbUsers,
    envList
  };
}
