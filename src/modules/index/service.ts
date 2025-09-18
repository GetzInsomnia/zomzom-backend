import { promises as fs } from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import { PropertyType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { env } from '../../env';
import { ensureDir } from '../../common/utils/file';

type SupportedLocale = 'th' | 'en' | 'zh';

interface PropertyDoc {
  id: string;
  entityId: string;
  slug: string;
  locale: SupportedLocale;
  title: string;
  description: string;
  status: string;
  type: PropertyType;
  price: number;
  province: string;
  location: string;
  deposit: boolean;
}

interface LocaleBucket {
  docs: PropertyDoc[];
  index: MiniSearch<PropertyDoc>;
}

interface ShardBucket {
  province: string;
  type: PropertyType;
  fileName: string;
  locales: Partial<Record<SupportedLocale, LocaleBucket>>;
}

interface ShardMetadata {
  file: string;
  province: string;
  type: PropertyType;
  totalDocs: number;
  locales: Record<string, number>;
}

interface SuggestionRecord {
  type: 'property' | 'article' | 'location';
  id: string;
  slug: string | null;
  status?: string;
  propertyType?: PropertyType;
  locale: string;
  title: string;
  normalized: string;
}

interface SuggestFile {
  generatedAt: string;
  items: SuggestionRecord[];
}

interface IndexSummary {
  generatedAt: string;
  counts: {
    properties: number;
    articles: number;
    locations: number;
    suggestions: number;
  };
  shards: ShardMetadata[];
}

const SUPPORTED_LOCALES: SupportedLocale[] = ['th', 'en', 'zh'];

export class IndexService {
  static async rebuild() {
    const [properties, articles, locations] = await Promise.all([
      prisma.property.findMany({
        where: {
          workflowState: 'PUBLISHED',
          deletedAt: null
        },
        include: {
          i18n: true,
          location: true
        }
      }),
      prisma.article.findMany({
        where: {
          workflowState: 'PUBLISHED',
          deletedAt: null
        },
        include: {
          i18n: true
        }
      }),
      prisma.location.findMany()
    ]);

    const generatedAt = new Date().toISOString();
    const indexDir = path.resolve(env.INDEX_DIR);
    await ensureDir(indexDir);

    const shardBuckets = new Map<string, ShardBucket>();
    const suggestions: SuggestionRecord[] = [];

    for (const property of properties) {
      const province = this.normalizeProvince(property.location?.province);
      const shardKey = `${province}::${property.type}`;
      let shard = shardBuckets.get(shardKey);
      if (!shard) {
        const fileName = `${this.toFileSlug(province)}-${property.type.toLowerCase()}.json`;
        shard = {
          province,
          type: property.type,
          fileName,
          locales: {}
        };
        shardBuckets.set(shardKey, shard);
      }

      for (const entry of property.i18n) {
        const normalizedLocale = this.normalizeLocale(entry.locale);
        if (!this.isSupportedLocale(normalizedLocale)) {
          continue;
        }

        const locale = normalizedLocale;
        const locationLabel = this.composeLocationLabel(property.location?.district, province);
        const doc: PropertyDoc = {
          id: `${property.id}:${locale}`,
          entityId: property.id,
          slug: property.slug,
          locale,
          title: entry.title,
          description: entry.description ?? '',
          status: property.status,
          type: property.type,
          price: property.price,
          province,
          location: locationLabel,
          deposit: property.deposit ?? false
        };

        let localeBucket = shard.locales[locale];
        if (!localeBucket) {
          localeBucket = {
            docs: [],
            index: this.createMiniSearch()
          };
          shard.locales[locale] = localeBucket;
        }

        localeBucket.docs.push(doc);
        localeBucket.index.add(doc);

        suggestions.push({
          type: 'property',
          id: property.id,
          slug: property.slug,
          status: property.status,
          propertyType: property.type,
          locale,
          title: entry.title,
          normalized: this.normalizeText(entry.title)
        });
      }
    }

    for (const article of articles) {
      for (const entry of article.i18n) {
        const locale = this.normalizeLocale(entry.locale);
        suggestions.push({
          type: 'article',
          id: article.id,
          slug: article.slug,
          locale,
          title: entry.title,
          normalized: this.normalizeText(entry.title)
        });
      }
    }

    for (const location of locations) {
      const label = this.composeLocationLabel(location.district, location.province);
      suggestions.push({
        type: 'location',
        id: location.id,
        slug: null,
        locale: 'th',
        title: label,
        normalized: this.normalizeText(label)
      });
    }

    suggestions.sort(
      (a, b) =>
        a.normalized.localeCompare(b.normalized, undefined, { sensitivity: 'base' }) ||
        a.title.localeCompare(b.title)
    );

    const manifest: ShardMetadata[] = [];
    const keepFiles = new Set<string>();

    const orderedShards = Array.from(shardBuckets.values()).sort(
      (a, b) =>
        a.province.localeCompare(b.province, undefined, { sensitivity: 'base' }) ||
        a.type.localeCompare(b.type)
    );

    for (const shard of orderedShards) {
      const localesPayload = Object.entries(shard.locales).reduce<Record<string, { docs: PropertyDoc[]; index: unknown }>>(
        (acc, [locale, localeBucket]) => {
          acc[locale] = {
            docs: localeBucket.docs,
            index: localeBucket.index.toJSON()
          };
          return acc;
        },
        {}
      );

      const totalDocs = Object.values(localesPayload).reduce((sum, localeData) => sum + localeData.docs.length, 0);
      const localeCounts = Object.fromEntries(
        Object.entries(localesPayload).map(([locale, data]) => [locale, data.docs.length])
      );

      if (Object.keys(localesPayload).length === 0) {
        continue;
      }

      const payload = {
        generatedAt,
        province: shard.province,
        type: shard.type,
        locales: localesPayload
      };

      await this.writeJson(path.join(indexDir, shard.fileName), payload);
      keepFiles.add(shard.fileName);

      manifest.push({
        file: shard.fileName,
        province: shard.province,
        type: shard.type,
        totalDocs,
        locales: localeCounts
      });
    }

    const suggestPayload: SuggestFile = {
      generatedAt,
      items: suggestions
    };
    await this.writeJson(path.join(indexDir, 'suggest.json'), suggestPayload);
    keepFiles.add('suggest.json');

    const summary: IndexSummary = {
      generatedAt,
      counts: {
        properties: properties.length,
        articles: articles.length,
        locations: locations.length,
        suggestions: suggestions.length
      },
      shards: manifest
    };
    await this.writeJson(path.join(indexDir, 'summary.json'), summary);
    keepFiles.add('summary.json');

    await this.writeJson(path.join(indexDir, 'manifest.json'), { generatedAt, shards: manifest });
    keepFiles.add('manifest.json');

    await this.cleanupObsoleteFiles(indexDir, keepFiles);

    return summary;
  }

  static async rebuildSafe() {
    try {
      return await this.rebuild();
    } catch (error) {
      console.error('Failed to rebuild search index', error);
      return null;
    }
  }

  private static createMiniSearch() {
    return new MiniSearch<PropertyDoc>({
      fields: ['title', 'description', 'province', 'location'],
      storeFields: ['entityId', 'slug', 'title', 'locale', 'status', 'type', 'price', 'deposit', 'province', 'location']
    });
  }

  private static normalizeLocale(locale: string) {
    return locale.split('-')[0].toLowerCase();
  }

  private static normalizeProvince(province?: string | null) {
    const trimmed = province?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : 'Unknown';
  }

  private static isSupportedLocale(locale: string): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
  }

  private static composeLocationLabel(district?: string | null, province?: string | null) {
    const parts = [district, province].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(' - ') : 'Unknown';
  }

  private static normalizeText(value: string) {
    return value.normalize('NFKC').trim().toLowerCase();
  }

  private static toFileSlug(value: string) {
    const normalized = value.normalize('NFKC').trim().toLowerCase();
    return (
      normalized
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'unknown'
    );
  }

  private static async writeJson(targetPath: string, data: unknown) {
    const directory = path.dirname(targetPath);
    await ensureDir(directory);
    const tmpPath = `${targetPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data));
    await fs.rename(tmpPath, targetPath);
  }

  private static async cleanupObsoleteFiles(directory: string, keepFiles: Set<string>) {
    const files = await fs.readdir(directory);
    await Promise.all(
      files
        .filter((file) => file.endsWith('.json') && !keepFiles.has(file))
        .map(async (file) => {
          try {
            await fs.unlink(path.join(directory, file));
          } catch (error) {
            console.error('Failed to remove obsolete index file', { file, error });
          }
        })
    );
  }
}
