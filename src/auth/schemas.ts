import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8)
});

export const verifyEmailQuerySchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .regex(/^[a-f0-9]{64}$/i, 'Token must be a 64-character hex string')
});
