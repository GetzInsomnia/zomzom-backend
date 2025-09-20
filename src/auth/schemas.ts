import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(191)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, underscores, hyphens, and dots'),
  email: z.string().email(),
  password: z.string().min(8)
});

export const verificationConfirmSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .regex(/^[a-f0-9]{64}$/i, 'Token must be a 64-character hex string')
});

export const revokeAllSessionsSchema = z.object({}).strict();
