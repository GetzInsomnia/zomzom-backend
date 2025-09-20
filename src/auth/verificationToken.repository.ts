import type { Prisma, PrismaClient, VerificationToken } from '@prisma/client';
import { prisma } from '../prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

type CreateVerificationParams = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  email?: string | null;
};

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export class VerificationTokenRepository {
  static async create(
    data: CreateVerificationParams,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken> {
    const db = getClient(client);
    return db.verificationToken.create({ data });
  }

  static async findByTokenHash(
    tokenHash: string,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken | null> {
    const db = getClient(client);
    return db.verificationToken.findUnique({ where: { tokenHash } });
  }

  static async markUsed(
    id: string,
    usedAt: Date,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken> {
    const db = getClient(client);
    return db.verificationToken.update({ where: { id }, data: { usedAt } });
  }

  static async deleteExpiredForUser(
    userId: string,
    now: Date,
    client?: PrismaClientOrTx
  ): Promise<number> {
    const db = getClient(client);
    const result = await db.verificationToken.deleteMany({
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
