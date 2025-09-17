import { z } from 'zod';

export const suggestQuerySchema = z.object({
  q: z.string().min(1)
});
