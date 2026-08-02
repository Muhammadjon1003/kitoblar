import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getSession(userId: number) {
  let session = await prisma.session.findUnique({
    where: { userId: String(userId) },
  });
  if (!session) {
    session = await prisma.session.create({
      data: { userId: String(userId), state: 'IDLE', data: '{}' },
    });
  }
  return {
    state: session.state,
    data: JSON.parse(session.data || '{}'),
  };
}

export async function setSession(userId: number, state: string, data: any) {
  await prisma.session.upsert({
    where: { userId: String(userId) },
    update: { state, data: JSON.stringify(data) },
    create: { userId: String(userId), state, data: JSON.stringify(data) },
  });
}

export async function clearSession(userId: number) {
  await prisma.session.upsert({
    where: { userId: String(userId) },
    update: { state: 'IDLE', data: '{}' },
    create: { userId: String(userId), state: 'IDLE', data: '{}' },
  });
}
