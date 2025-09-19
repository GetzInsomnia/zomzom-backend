import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { env } from '../env';
import { httpError } from '../common/utils/httpErrors';
import { Role } from '../prisma/types';
import { createAuditLog } from '../common/utils/audit';

const BCRYPT_SALT_ROUNDS = 10;

export class AuthService {
  static async login(username: string, password: string, ipAddress?: string | null) {
    const logAttempt = async (
      success: boolean,
      params: { userId?: string | null; reason?: string }
    ) => {
      try {
        await createAuditLog(prisma, {
          userId: params.userId ?? null,
          action: success ? 'auth.login.success' : 'auth.login.failure',
          entityType: 'Auth',
          entityId: params.userId ?? null,
          meta: { username, reason: params.reason ?? null },
          ipAddress: ipAddress ?? null
        });
      } catch (error) {
        // Logging failures should not block authentication flow
        console.warn('Failed to record auth attempt', error);
      }
    };

    let user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      const userCount = await prisma.user.count();
      const hasFallbackCreds = Boolean(env.ADMIN_FALLBACK_USERNAME && env.ADMIN_FALLBACK_PASSWORD);

      if (userCount === 0 && hasFallbackCreds) {
        if (username === env.ADMIN_FALLBACK_USERNAME && password === env.ADMIN_FALLBACK_PASSWORD) {
          const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
          user = await prisma.user.create({
            data: {
              username,
              passwordHash,
              role: 'ADMIN',
              isActive: true,
              tokenVersion: 0
            }
          });
        } else {
          await logAttempt(false, { reason: 'invalid_fallback_credentials' });
          throw httpError(401, 'Invalid credentials');
        }
      } else {
        await logAttempt(false, { reason: 'user_not_found' });
        throw httpError(401, 'Invalid credentials');
      }
    }

    const authenticatedUser = user!;

    if (!authenticatedUser.isActive) {
      await logAttempt(false, { userId: authenticatedUser.id, reason: 'inactive' });
      throw httpError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, authenticatedUser.passwordHash);
    if (!isValid) {
      await logAttempt(false, { userId: authenticatedUser.id, reason: 'invalid_password' });
      throw httpError(401, 'Invalid credentials');
    }

    await logAttempt(true, { userId: authenticatedUser.id });

    return {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      role: authenticatedUser.role as Role,
      tokenVersion: authenticatedUser.tokenVersion
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      throw httpError(404, 'User not found');
    }

    return {
      ...user,
      role: user.role as Role
    };
  }
}
