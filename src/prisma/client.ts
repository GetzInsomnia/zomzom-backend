import { PrismaClient } from '@prisma/client';
import { env } from '../env';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClient = global.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}

export const prisma = prismaClient;
