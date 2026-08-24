import { Router } from 'express';
import { prisma } from '../prisma';
import { formatChatId } from '../telegram';

const router = Router();

// GET /backend/settings — return global settings & active group configuration
router.get('/backend/settings', async (req, res) => {
  try {
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', sotuvNarxi: 0 },
    });

    const envSupplierGroupId = process.env.SUPPLIER_GROUP_ID || process.env.NEXT_PUBLIC_SUPPLIER_GROUP_ID || '';
    const activeStaffGroupId = formatChatId(settings.staffGroupId || process.env.STAFF_GROUP_ID || '');
    const activeSupplierGroupId = formatChatId(settings.staffGroupId || envSupplierGroupId || process.env.STAFF_GROUP_ID || '');
    const activeStorageChannelId = formatChatId(settings.storageChannelId || process.env.STORAGE_CHANNEL_ID || '');

    res.json({
      sotuvNarxi: settings.sotuvNarxi,
      staffGroupId: settings.staffGroupId || '',
      storageChannelId: settings.storageChannelId || '',
      envStaffGroupId: process.env.STAFF_GROUP_ID || '',
      envSupplierGroupId,
      envStorageChannelId: process.env.STORAGE_CHANNEL_ID || '',
      activeStaffGroupId,
      activeSupplierGroupId,
      activeStorageChannelId,
      updatedAt: settings.updatedAt
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /backend/settings — update selling price or telegram group settings
router.patch('/backend/settings', async (req, res) => {
  try {
    const { sotuvNarxi, staffGroupId, storageChannelId } = req.body;

    const updateData: any = {};
    if (sotuvNarxi !== undefined && !isNaN(Number(sotuvNarxi))) {
      updateData.sotuvNarxi = Number(sotuvNarxi);
    }
    if (staffGroupId !== undefined) {
      updateData.staffGroupId = String(staffGroupId).trim();
    }
    if (storageChannelId !== undefined) {
      updateData.storageChannelId = String(storageChannelId).trim();
    }

    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: updateData,
      create: { id: 'global', sotuvNarxi: 0, ...updateData },
    });

    res.json({
      sotuvNarxi: settings.sotuvNarxi,
      staffGroupId: settings.staffGroupId || '',
      storageChannelId: settings.storageChannelId || '',
      updatedAt: settings.updatedAt
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /backend/telegram-users — List all authorized Telegram Bot users
router.get('/backend/telegram-users', async (req, res) => {
  try {
    const users = await prisma.allowedTelegramUser.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/telegram-users — Authorize a new Telegram Chat ID / User
router.post('/backend/telegram-users', async (req, res) => {
  try {
    const { chatId, fullName } = req.body;
    if (!chatId) return res.status(400).json({ error: "Telegram Chat ID kiritilishi shart." });
    const strId = String(chatId).trim();
    const user = await prisma.allowedTelegramUser.upsert({
      where: { chatId: strId },
      update: { fullName: String(fullName || '').trim() },
      create: { chatId: strId, fullName: String(fullName || '').trim() }
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /backend/telegram-users/:chatId — Revoke access for a Telegram Chat ID
router.delete('/backend/telegram-users/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    await prisma.allowedTelegramUser.delete({
      where: { chatId: String(chatId).trim() }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
