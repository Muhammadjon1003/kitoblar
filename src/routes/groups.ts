import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /backend/groups — fetch all groups, map to frontend Group shape
router.get('/backend/groups', async (req, res) => {
  try {
    const groups = await prisma.erpGroup.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { students: true } } }
    });
    res.json(groups.map(g => ({
      id: g.id,
      groupName: g.groupName,
      teacherName: g.teacherName,
      subjectCategory: g.subjectCategory,
      startDate: g.startDate,
      endDate: g.endDate,
      orderIntervalDays: g.orderIntervalDays,
      createdAt: g.createdAt.toISOString().slice(0, 10),
      studentCount: g._count.students,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/groups — create a new group
router.post('/backend/groups', async (req, res) => {
  try {
    const { groupName, teacherName, subjectCategory, startDate, endDate, orderIntervalDays } = req.body;
    if (!groupName || !teacherName) {
      return res.status(400).json({ error: 'groupName and teacherName are required.' });
    }
    const group = await prisma.erpGroup.create({
      data: {
        groupName,
        teacherName,
        subjectCategory: subjectCategory ?? '',
        startDate: startDate ?? '',
        endDate: endDate ?? '',
        orderIntervalDays: orderIntervalDays ?? 30,
      }
    });
    res.status(201).json({
      id: group.id,
      groupName: group.groupName,
      teacherName: group.teacherName,
      subjectCategory: group.subjectCategory,
      startDate: group.startDate,
      endDate: group.endDate,
      orderIntervalDays: group.orderIntervalDays,
      createdAt: group.createdAt.toISOString().slice(0, 10),
      studentCount: 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
