import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../../env';

interface SuggestionRecord {
  type: 'property' | 'article' | 'location';
  id: string;
  slug: string | null;
  status?: string;
  propertyType?: string;
  locale: string;
  title: string;
  normalized: string;
}

interface SuggestFile {
  generatedAt: string;
  items: SuggestionRecord[];
}

interface SuggestCache {
  mtimeMs: number;
  data: SuggestFile;
}

export class SuggestService {
  private static cache: SuggestCache | null = null;

  static async search(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const data = await this.loadData();
    const matches = data.items
      .filter((item) => item.normalized.startsWith(normalizedQuery))
      .slice(0, 10)
      .map(({ normalized, ...rest }) => rest);

    return matches;
  }

  private static async loadData(): Promise<SuggestFile> {
    const filePath = path.resolve(env.INDEX_DIR, 'suggest.json');
    try {
      const stat = await fs.stat(filePath);
      if (this.cache && this.cache.mtimeMs === stat.mtimeMs) {
        return this.cache.data;
      }

      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SuggestFile>;
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const normalizedItems: SuggestionRecord[] = items.map((item: any) => {
        const title = typeof item.title === 'string' ? item.title : String(item.title ?? '');
        return {
          type: item.type,
          id: item.id,
          slug: item.slug ?? null,
          status: item.status,
          propertyType: item.propertyType,
          locale: item.locale,
          title,
          normalized: typeof item.normalized === 'string' ? item.normalized : this.normalizeText(title)
        };
      });

      const data: SuggestFile = {
        generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : new Date(stat.mtimeMs).toISOString(),
        items: normalizedItems
      };

      this.cache = { mtimeMs: stat.mtimeMs, data };
      return data;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        const empty: SuggestFile = { generatedAt: new Date(0).toISOString(), items: [] };
        this.cache = { mtimeMs: 0, data: empty };
        return empty;
      }
      throw error;
    }
  }

  private static normalizeText(value: string) {
    return value.normalize('NFKC').trim().toLowerCase();
  }
}
