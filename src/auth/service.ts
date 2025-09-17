import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { env } from '../env';
import { httpError } from '../common/utils/httpErrors';
import { Role } from '../prisma/types';

const TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

export class AuthService {
  static async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      throw httpError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw httpError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        username: user.username
      },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_SECONDS }
    );

    return {
      token,
      expiresIn: TOKEN_EXPIRY_SECONDS,
      user: {
        id: user.id,
        username: user.username,
        role: user.role as Role
      }
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
