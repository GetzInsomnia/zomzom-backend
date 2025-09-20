import { randomBytes, createHash } from 'crypto';
import { prisma } from '../prisma/client';
import { httpError } from '../common/utils/httpErrors';
import { VerificationTokenRepository } from './verificationToken.repository';

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000; // 1 hour

export type EmailVerificationIssueResult = {
  token: string;
  expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class EmailVerificationService {
  static async issueToken(userId: string): Promise<EmailVerificationIssueResult> {
    const token = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await VerificationTokenRepository.deleteExpiredForUser(userId, new Date(), tx);
      await VerificationTokenRepository.create({ userId, tokenHash, expiresAt }, tx);
    });

    return { token, expiresAt };
  }

  static async consumeToken(token: string) {
    const tokenHash = hashToken(token);
    const verification = await VerificationTokenRepository.findByTokenHash(tokenHash);

    if (!verification) {
      throw httpError(400, 'Invalid verification token');
    }

    if (verification.usedAt) {
      throw httpError(400, 'Invalid verification token');
    }

    const now = new Date();
    if (verification.expiresAt.getTime() <= now.getTime()) {
      throw httpError(400, 'Invalid verification token');
    }

    if (!verification.userId) {
      throw httpError(400, 'Invalid verification token');
    }

    await prisma.$transaction(async (tx) => {
      await VerificationTokenRepository.markUsed(verification.id, now, tx);
      await tx.user.update({
        where: { id: verification.userId },
        data: { isActive: true, emailVerifiedAt: now }
      });
    });

    return { ok: true } as const;
  }
}
