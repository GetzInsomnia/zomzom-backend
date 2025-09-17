import { promises as fs } from 'fs';
import path from 'path';
import { FastifyRequest } from 'fastify';
import formidable, { File as FormidableFile } from 'formidable';
import sharp from 'sharp';
import { env } from '../../env';
import { httpError } from '../../common/utils/httpErrors';
import { ensureDir, uniqueFilename } from '../../common/utils/file';

export interface ProcessedImage {
  filename: string;
  url: string;
  path: string;
  width: number;
  height: number;
  size: number;
}

export class UploadService {
  static async parseImageRequest(request: FastifyRequest) {
    const form = formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024,
      maxTotalFileSize: 50 * 1024 * 1024,
      allowEmptyFiles: false,
      maxFiles: 10,
      filter: (part) => Boolean(part.mimetype && part.mimetype.startsWith('image/'))
    });

    const files = await new Promise<FormidableFile[]>((resolve, reject) => {
      const collected: FormidableFile[] = [];
      form.on('file', (_, file) => {
        collected.push(file);
      });
      form.on('error', (err) => reject(err));
      form.parse(request.raw, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(collected);
        }
      });
    });

    if (!files.length) {
      throw httpError(400, 'No files uploaded');
    }

    return files;
  }

  static async processPropertyImages(propertyId: string, files: FormidableFile[]): Promise<ProcessedImage[]> {
    const baseUploadDir = path.resolve(env.UPLOAD_DIR);
    const propertyDir = path.join(baseUploadDir, 'properties', propertyId);
    await ensureDir(propertyDir);

    const processed: ProcessedImage[] = [];

    for (const file of files) {
      const filename = uniqueFilename('.jpg');
      const destination = path.join(propertyDir, filename);
      let pipeline = sharp(file.filepath).rotate().resize({ width: 1600, withoutEnlargement: true });

      if (env.WATERMARK_ENABLED) {
        pipeline = pipeline.composite([
          {
            input: Buffer.from(this.createWatermarkSvg(env.WATERMARK_TEXT)),
            gravity: 'southeast'
          }
        ]);
      }

      const { data, info } = await pipeline
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });

      await fs.writeFile(destination, data);
      await fs.unlink(file.filepath).catch(() => undefined);

      processed.push({
        filename,
        url: `/uploads/properties/${propertyId}/${filename}`,
        path: destination,
        width: info.width ?? 0,
        height: info.height ?? 0,
        size: data.length
      });
    }

    return processed;
  }

  private static createWatermarkSvg(text: string) {
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120">\n  <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.0)"/>\n  <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="rgba(255,255,255,0.65)" font-family="Arial, Helvetica, sans-serif" font-weight="bold">${safeText}</text>\n</svg>`;
  }
}
