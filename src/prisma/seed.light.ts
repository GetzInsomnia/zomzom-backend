import { config } from 'dotenv';
config();

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USER || 'admin';
  const password = process.env.SEED_ADMIN_PASS || 'admin1234';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, isActive: true },
    create: { username, passwordHash }
  });

  console.log(`Seeded admin user: ${username}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
