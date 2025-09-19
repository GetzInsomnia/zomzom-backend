import { z } from 'zod';

export const rebuildRequestSchema = z.object({});

export type RebuildBody = z.infer<typeof rebuildRequestSchema>;
