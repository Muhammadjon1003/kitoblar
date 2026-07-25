import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /backend/settings — return global settings, creating defaults if needed
router.get('/backend/settings', async (req, res) => {
  try {
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', sotuvNarxi: 0 },
    });
    res.json({ sotuvNarxi: settings.sotuvNarxi, updatedAt: settings.updatedAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /backend/settings — manager updates the active selling price
router.patch('/backend/settings', async (req, res) => {
  try {
    const { sotuvNarxi } = req.body;
    if (sotuvNarxi === undefined || isNaN(Number(sotuvNarxi))) {
      return res.status(400).json({ error: 'sotuvNarxi (number) is required.' });
    }
    const settings = await prisma.erpSettings.upsert({
      where:  { id: 'global' },
      update: { sotuvNarxi: Number(sotuvNarxi) },
      create: { id: 'global', sotuvNarxi: Number(sotuvNarxi) },
    });
    res.json({ sotuvNarxi: settings.sotuvNarxi, updatedAt: settings.updatedAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
