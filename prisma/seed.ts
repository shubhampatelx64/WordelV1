import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const words = [
  'APPLE','BERRY','CHARM','DELTA','EAGLE','FLAME','GRAPE','HOUSE','IVORY','JELLY',
  'KNIFE','LEMON','MANGO','NOBLE','OCEAN','PEARL','QUILT','RIVER','SOLAR','TIGER',
  'ULTRA','VIVID','WATER','XENON','YEARN','ZEBRA','ALERT','BRICK','CLOUD','DREAM',
  'EPOCH','FROST','GIANT','HONEY','INDEX','JOKER','KOALA','LIGHT','MIRTH','NERVE',
  'OPERA','PILOT','QUEST','ROUTE','SHINE','TRAIL','UNION','VAPOR','WOVEN','YOUNG'
];

function dateKeyUTC(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const adminHash = await hash('Admin123!', 12);
  const userHash = await hash('Password123!', 12);
  const creatorHash = await hash('Creator123!', 12);

  const admin = await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: { passwordHash: adminHash, displayName: 'Admin', role: 'ADMIN', bannedAt: null }, create: { email: 'admin@example.com', passwordHash: adminHash, displayName: 'Admin', role: 'ADMIN' } });
  await prisma.user.upsert({ where: { email: 'player@example.com' }, update: { passwordHash: userHash, displayName: 'Player One', role: 'USER', bannedAt: null }, create: { email: 'player@example.com', passwordHash: userHash, displayName: 'Player One', role: 'USER' } });
  const creator = await prisma.user.upsert({ where: { email: 'creator@example.com' }, update: { passwordHash: creatorHash, displayName: 'Creator One', role: 'CREATOR', bannedAt: null }, create: { email: 'creator@example.com', passwordHash: creatorHash, displayName: 'Creator One', role: 'CREATOR' } });

  for (const word of words) {
    await prisma.word.upsert({ where: { text: word }, update: { isActive: true, difficulty: 'medium', length: 5, tags: ['common'] }, create: { text: word, difficulty: 'medium', length: 5, isActive: true, tags: ['common'] } });
  }

  const answer = await prisma.word.findUniqueOrThrow({ where: { text: 'APPLE' } });
  await prisma.hint.deleteMany({ where: { wordId: answer.id } });
  await prisma.hint.createMany({ data: [
    { wordId: answer.id, type: 'CATEGORY', content: 'A fruit', cost: 20, order: 1 },
    { wordId: answer.id, type: 'FIRST_LETTER', content: 'Starts with A', cost: 30, order: 2 },
    { wordId: answer.id, type: 'RIDDLE', content: 'Keeps doctors away', cost: 40, order: 3 }
  ] });

  for (const offset of [0,1]) {
    await prisma.game.upsert({
      where: { mode_dateKey_length_difficulty: { mode: 'DAILY', dateKey: dateKeyUTC(offset), length: 5, difficulty: 'medium' } },
      update: { answerWordId: answer.id, maxAttempts: 6, isActive: true },
      create: { mode: 'DAILY', dateKey: dateKeyUTC(offset), length: 5, maxAttempts: 6, hardModeAllowed: true, answerWordId: answer.id, difficulty: 'medium', isActive: true }
    });
  }

  await prisma.game.upsert({
    where: { shareCode: 'PHASE2A' },
    update: { answerWordId: answer.id, creatorUserId: creator.id, isActive: true },
    create: { mode: 'CUSTOM', shareCode: 'PHASE2A', creatorUserId: creator.id, answerWordId: answer.id, length: 5, maxAttempts: 6, difficulty: 'medium', hardModeAllowed: true, dictionaryMode: 'STRICT', allowReplay: false, isActive: true }
  });

  await prisma.auditLog.create({ data: { actorUserId: admin.id, action: 'SEED_INIT', targetType: 'SYSTEM', targetId: null, metadata: { ok: true } } });

  console.log('Seeded phase2 data');
}

main().finally(() => prisma.$disconnect());
