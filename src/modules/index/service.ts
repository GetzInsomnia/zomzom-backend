import { promises as fs } from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import { prisma } from '../../prisma/client';
import { env } from '../../env';
import { ensureDir } from '../../common/utils/file';

interface IndexSummary {
  generatedAt: string;
  counts: {
    properties: number;
    articles: number;
  };
}

export class IndexService {
  static async rebuild() {
    const [properties, articles] = await Promise.all([
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
      })
    ]);

    const propertyDocs = properties.flatMap((property: any) =>
      property.i18n.map((entry: any) => ({
        id: `${property.id}:${entry.locale}`,
        entityId: property.id,
        slug: property.slug,
        locale: entry.locale,
        title: entry.title,
        description: entry.description ?? '',
        status: property.status,
        type: property.type,
        price: property.price,
        location: property.location?.province ?? '',
        deposit: property.deposit ?? false
      }))
    );

    const articleDocs = articles.flatMap((article: any) =>
      article.i18n.map((entry: any) => ({
        id: `${article.id}:${entry.locale}`,
        entityId: article.id,
        slug: article.slug,
        locale: entry.locale,
        title: entry.title,
        body: typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body)
      }))
    );

    const propertyIndex = new MiniSearch({
      fields: ['title', 'description', 'location'],
      storeFields: ['entityId', 'slug', 'title', 'locale', 'status', 'type', 'price', 'deposit']
    });
    propertyIndex.addAll(propertyDocs);

    const articleIndex = new MiniSearch({
      fields: ['title', 'body'],
      storeFields: ['entityId', 'slug', 'title', 'locale']
    });
    articleIndex.addAll(articleDocs);

    const summary: IndexSummary = {
      generatedAt: new Date().toISOString(),
      counts: {
        properties: propertyDocs.length,
        articles: articleDocs.length
      }
    };

    await this.writeJson('properties', propertyIndex.toJSON());
    await this.writeJson('articles', articleIndex.toJSON());
    await this.writeJson('summary', summary);

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

  private static async writeJson(name: string, data: unknown) {
    const directory = path.resolve(env.INDEX_DIR);
    await ensureDir(directory);
    const tmpPath = path.join(directory, `${name}.json.tmp`);
    const targetPath = path.join(directory, `${name}.json`);
    await fs.writeFile(tmpPath, JSON.stringify(data));
    await fs.rename(tmpPath, targetPath);
  }
}
