import type { Prisma, PrismaClient, EmailVerification } from '@prisma/client';
import { prisma } from '../prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

type CreateVerificationParams = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export class EmailVerificationRepository {
  static async create(
    data: CreateVerificationParams,
    client?: PrismaClientOrTx
  ): Promise<EmailVerification> {
    const db = getClient(client);
    return db.emailVerification.create({ data });
  }

  static async findByTokenHash(
    tokenHash: string,
    client?: PrismaClientOrTx
  ): Promise<EmailVerification | null> {
    const db = getClient(client);
    return db.emailVerification.findUnique({ where: { tokenHash } });
  }

  static async markUsed(
    id: string,
    usedAt: Date,
    client?: PrismaClientOrTx
  ): Promise<EmailVerification> {
    const db = getClient(client);
    return db.emailVerification.update({ where: { id }, data: { usedAt } });
  }

  static async deleteExpiredForUser(
    userId: string,
    now: Date,
    client?: PrismaClientOrTx
  ): Promise<number> {
    const db = getClient(client);
    const result = await db.emailVerification.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: now } },
          { usedAt: { not: null } }
        ]
      }
    });
    return result.count;
  }
}
