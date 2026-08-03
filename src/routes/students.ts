import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /backend/students — fetch all students (optionally filter by groupId)
router.get('/backend/students', async (req, res) => {
  try {
    const { groupId } = req.query;
    const where: any = {};
    if (groupId) where.groupId = groupId as string;
    const students = await prisma.erpStudent.findMany({
      where,
      orderBy: { joinedAt: 'asc' },
      include: { group: { select: { groupName: true } } }
    });
    res.json(students.map(s => ({
      id: s.id,
      fullName: s.fullName,
      name: s.fullName,
      phoneNumber: s.phoneNumber,
      groupId: s.groupId,
      groupName: s.group ? s.group.groupName : '—',
      joinedAt: s.joinedAt.toISOString().slice(0, 10),
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/students — enroll a new student into a group
router.post('/backend/students', async (req, res) => {
  try {
    const { fullName, phoneNumber, groupId } = req.body;
    if (!fullName || !groupId) {
      return res.status(400).json({ error: 'fullName and groupId are required.' });
    }
    // Verify group exists
    const group = await prisma.erpGroup.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const student = await prisma.erpStudent.create({
      data: { fullName, phoneNumber: phoneNumber ?? '', groupId }
    });
    res.status(201).json({
      id: student.id,
      fullName: student.fullName,
      phoneNumber: student.phoneNumber,
      groupId: student.groupId,
      groupName: group.groupName,
      joinedAt: student.joinedAt.toISOString().slice(0, 10),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/students/bulk — bulk enroll multiple students into a group at once
router.post('/backend/students/bulk', async (req, res) => {
  try {
    const { groupId, names, students } = req.body;
    if (!groupId) {
      return res.status(400).json({ error: 'Guruh tanlanishi shart (groupId).' });
    }

    // Verify group exists
    const group = await prisma.erpGroup.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Guruh topilmadi.' });

    let studentList: Array<{ fullName: string; phoneNumber?: string }> = [];

    if (Array.isArray(students) && students.length > 0) {
      studentList = students.map((s: any) =>
        typeof s === 'string'
          ? { fullName: s.trim() }
          : { fullName: (s.fullName || '').trim(), phoneNumber: (s.phoneNumber || '').trim() }
      );
    } else if (Array.isArray(names) && names.length > 0) {
      studentList = names.map((n: any) => ({ fullName: String(n).trim() }));
    }

    studentList = studentList.filter(s => s.fullName.length > 0);

    if (studentList.length === 0) {
      return res.status(400).json({ error: "Kamida bitta o'quvchi ismi kiritilishi shart." });
    }

    const created = await prisma.erpStudent.createMany({
      data: studentList.map(s => ({
        fullName: s.fullName,
        phoneNumber: s.phoneNumber || '',
        groupId,
      }))
    });

    res.status(201).json({
      success: true,
      count: created.count,
      groupId,
      groupName: group.groupName,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
