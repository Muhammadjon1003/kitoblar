import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /backend/settings — return global settings & active group configuration
router.get('/backend/settings', async (req, res) => {
  try {
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', sotuvNarxi: 0 },
    });

    const activeStaffGroupId = settings.staffGroupId || process.env.STAFF_GROUP_ID || '';
    const activeStorageChannelId = settings.storageChannelId || process.env.STORAGE_CHANNEL_ID || '';

    res.json({
      sotuvNarxi: settings.sotuvNarxi,
      staffGroupId: settings.staffGroupId || '',
      storageChannelId: settings.storageChannelId || '',
      envStaffGroupId: process.env.STAFF_GROUP_ID || '',
      envStorageChannelId: process.env.STORAGE_CHANNEL_ID || '',
      activeStaffGroupId,
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

export default router;
