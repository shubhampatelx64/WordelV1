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

function dateKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const adminHash = await hash('Admin123!', 12);
  const userHash = await hash('Password123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminHash, displayName: 'Admin' },
    create: { email: 'admin@example.com', passwordHash: adminHash, displayName: 'Admin', role: 'ADMIN' }
  });

  await prisma.user.upsert({
    where: { email: 'player@example.com' },
    update: { passwordHash: userHash, displayName: 'Player One' },
    create: { email: 'player@example.com', passwordHash: userHash, displayName: 'Player One', role: 'USER' }
  });

  for (const word of words) {
    await prisma.word.upsert({
      where: { text: word },
      update: { isActive: true, difficulty: 'medium', length: 5 },
      create: { text: word, difficulty: 'medium', length: 5, isActive: true }
    });
  }

  const answer = await prisma.word.findUniqueOrThrow({ where: { text: 'APPLE' } });
  const dateKey = dateKeyUTC();

  await prisma.game.upsert({
    where: { mode_dateKey_length: { mode: 'DAILY', dateKey, length: 5 } },
    update: { answerWordId: answer.id, maxAttempts: 6, isActive: true },
    create: {
      mode: 'DAILY',
      dateKey,
      length: 5,
      maxAttempts: 6,
      hardModeAllowed: true,
      answerWordId: answer.id,
      isActive: true
    }
  });

  console.log('Seeded users, words, and daily game for', dateKey);
}

main().finally(() => prisma.$disconnect());
