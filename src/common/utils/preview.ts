import { FastifyRequest } from 'fastify';
import { httpError } from './httpErrors';
import { getUserFromRequest } from './requestUser';

const PREVIEW_HEADER = 'x-preview-mode';

function parsePreviewHeader(value: string | string[] | undefined): boolean {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => parsePreviewHeader(entry));
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export async function resolvePreviewMode(request: FastifyRequest) {
  const shouldPreview = parsePreviewHeader(request.headers[PREVIEW_HEADER]);

  if (!shouldPreview) {
    request.previewMode = false;
    return { preview: false } as const;
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    throw httpError(401, 'Unauthorized');
  }

  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    throw httpError(403, 'Forbidden');
  }

  request.user = user;
  request.previewMode = true;

  return { preview: true } as const;
}

export function isWithinRetention(deletedAt: Date | null, retentionMs: number) {
  if (!deletedAt) {
    return true;
  }

  const cutoff = Date.now() - retentionMs;
  return deletedAt.getTime() >= cutoff;
}
