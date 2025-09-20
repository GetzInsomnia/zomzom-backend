import { prisma } from '../prisma/client';
import { RefreshTokenRepository } from './refreshToken.repository';
import {
  generateTokenId,
  hashToken,
  signRefreshToken,
  type RefreshTokenPayload
} from './token';

const now = () => new Date();

export class RefreshTokenService {
  static async issueForLogin(params: {
    userId: string;
    tokenVersion: number;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const tokenId = generateTokenId();
    const familyId = generateTokenId();
    const refreshToken = signRefreshToken({
      sub: params.userId,
      tid: tokenId,
      fid: familyId,
      tv: params.tokenVersion
    });

    await RefreshTokenRepository.create({
      id: tokenId,
      userId: params.userId,
      tokenHash: hashToken(refreshToken),
      familyId,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null
    });

    return { refreshToken, familyId, tokenId };
  }

  static async rotate(params: {
    rawToken: string;
    payload: RefreshTokenPayload;
    tokenVersion: number;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const tokenRecord = await RefreshTokenRepository.findById(params.payload.tid);
    const hashed = hashToken(params.rawToken);
    const timestamp = now();

    if (
      !tokenRecord ||
      tokenRecord.userId !== params.payload.sub ||
      tokenRecord.familyId !== params.payload.fid
    ) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      throw new Error('Refresh token reuse detected');
    }

    if (tokenRecord.tokenHash !== hashed || tokenRecord.revokedAt) {
      await RefreshTokenRepository.revokeFamily(
        tokenRecord.userId,
        tokenRecord.familyId,
        timestamp
      );
      throw new Error('Refresh token reuse detected');
    }

    const newTokenId = generateTokenId();
    const refreshToken = signRefreshToken({
      sub: params.payload.sub,
      tid: newTokenId,
      fid: tokenRecord.familyId,
      tv: params.tokenVersion
    });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.$transaction(async (tx) => {
      await RefreshTokenRepository.revoke(tokenRecord.id, timestamp, tx);
      await RefreshTokenRepository.create(
        {
          id: newTokenId,
          userId: tokenRecord.userId,
          tokenHash: refreshTokenHash,
          familyId: tokenRecord.familyId,
          rotatedFromId: tokenRecord.id,
          userAgent: params.userAgent ?? null,
          ipAddress: params.ipAddress ?? null
        },
        tx
      );
    });

    return refreshToken;
  }

  static async revokeActive(params: {
    rawToken: string;
    payload: RefreshTokenPayload;
  }) {
    const tokenRecord = await RefreshTokenRepository.findById(params.payload.tid);
    const timestamp = now();

    if (!tokenRecord) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      return;
    }

    if (tokenRecord.userId !== params.payload.sub || tokenRecord.familyId !== params.payload.fid) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      return;
    }

    if (tokenRecord.tokenHash !== hashToken(params.rawToken)) {
      await RefreshTokenRepository.revokeFamily(
        tokenRecord.userId,
        tokenRecord.familyId,
        timestamp
      );
      return;
    }

    await RefreshTokenRepository.revoke(tokenRecord.id, timestamp);
  }
}
