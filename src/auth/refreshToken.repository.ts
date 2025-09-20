import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma/client';

export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export type CreateRefreshTokenParams = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt?: Date | null;
};

export class RefreshTokenRepository {
  static async create(data: CreateRefreshTokenParams, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        rotatedFromId: data.rotatedFromId ?? null,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt ?? null
      }
    });
  }

  static async findById(id: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.findUnique({ where: { id } });
  }

  static async findByTokenHash(tokenHash: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.findUnique({ where: { tokenHash } });
  }

  static async revoke(id: string, revokedAt: Date, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.update({ where: { id }, data: { revokedAt } });
  }

  static async revokeFamily(userId: string, familyId: string, revokedAt: Date, client?: PrismaClientOrTx) {
    const db = getClient(client);
    await db.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt }
    });
  }

  static async deleteForUser(userId: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    await db.refreshToken.deleteMany({ where: { userId } });
  }
}
