import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function uniqueFilename(extension: string) {
  const safeExt = extension.startsWith('.') ? extension : `.${extension}`;
  return `${Date.now()}-${randomUUID()}${safeExt}`;
}

export function resolveUploadPath(...segments: string[]) {
  return path.join(...segments);
}
