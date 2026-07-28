import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// POST /backend/auth/login — Authenticate user
router.post('/backend/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi va parol talab qilinadi.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Check DB for matching user
    let user = await prisma.erpUser.findUnique({
      where: { username: cleanUsername }
    });

    // Special SuperAdmin / Developer Account Auto-Seed: admin.dev or superadmin
    if (!user && (cleanUsername === 'admin.dev' || cleanUsername === 'superadmin')) {
      user = await prisma.erpUser.create({
        data: {
          fullName: '⚡ Super Admin (Developer)',
          username: cleanUsername,
          password: String(password),
          role: 'SUPER_ADMIN',
        }
      });
    }

    // Fallback: Default Admin Seed if no user found for first setup
    if (!user) {
      const totalUsers = await prisma.erpUser.count().catch(() => 0);
      if (totalUsers === 0 && (cleanUsername === 'admin' || cleanUsername === 'manager')) {
        user = await prisma.erpUser.create({
          data: {
            fullName: 'Bosh Menejer',
            username: cleanUsername,
            password: String(password),
            role: 'MANAGER',
          }
        });
      }
    }

    if (!user || user.password !== String(password)) {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri." });
    }

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /backend/users — List all registered users (for Manager view)
router.get('/backend/users', async (req, res) => {
  try {
    const users = await prisma.erpUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        createdAt: true,
      }
    });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /backend/users — Create a new user account (Manager only)
router.post('/backend/users', async (req, res) => {
  try {
    const { fullName, username, password, role } = req.body;
    if (!fullName || !username || !password || !role) {
      return res.status(400).json({ error: 'Barcha maydonlar kiritilishi shart (fullName, username, password, role).' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await prisma.erpUser.findUnique({
      where: { username: cleanUsername }
    });

    if (existing) {
      return res.status(400).json({ error: `"${cleanUsername}" nomli foydalanuvchi allaqachon mavjud.` });
    }

    const newUser = await prisma.erpUser.create({
      data: {
        fullName: String(fullName).trim(),
        username: cleanUsername,
        password: String(password),
        role: String(role).toUpperCase(),
      }
    });

    res.json({
      id: newUser.id,
      fullName: newUser.fullName,
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /backend/users/:id — Delete a user account
router.delete('/backend/users/:id', async (req, res) => {
  try {
    await prisma.erpUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

// PATCH /backend/users/:id — Update password, role, or fullName of a user account
router.patch('/backend/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, role, fullName } = req.body;

    const data: any = {};
    if (password && String(password).trim()) data.password = String(password).trim();
    if (role && String(role).trim()) data.role = String(role).trim().toUpperCase();
    if (fullName && String(fullName).trim()) data.fullName = String(fullName).trim();

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "O'zgartirish uchun kamida bitta maydon kiritilishi shart." });
    }

    const updatedUser = await prisma.erpUser.update({
      where: { id },
      data,
    });

    res.json({
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
