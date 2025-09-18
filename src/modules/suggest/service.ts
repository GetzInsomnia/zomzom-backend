import { prisma } from '../../prisma/client';

export class SuggestService {
  static async search(query: string) {
    const normalized = query.trim();
    if (!normalized) {
      return [];
    }

    const [propertyTitles, articleTitles, locations] = await Promise.all([
      prisma.propertyI18N.findMany({
        where: {
          title: {
            startsWith: normalized
          },
          property: {
            is: {
              workflowState: 'PUBLISHED',
              deletedAt: null
            }
          }
        },
        include: {
          property: {
            select: {
              id: true,
              slug: true,
              status: true,
              type: true
            }
          }
        },
        take: 6
      }),
      prisma.articleI18N.findMany({
        where: {
          title: {
            startsWith: normalized
          },
          article: {
            is: {
              workflowState: 'PUBLISHED',
              deletedAt: null
            }
          }
        },
        include: {
          article: {
            select: {
              id: true,
              slug: true
            }
          }
        },
        take: 3
      }),
      prisma.location.findMany({
        where: {
          province: {
            startsWith: normalized
          }
        },
        take: 3
      })
    ]);

    const suggestions = [
      ...propertyTitles.map((item: any) => ({
        type: 'property',
        id: item.property.id,
        slug: item.property.slug,
        status: item.property.status,
        propertyType: item.property.type,
        locale: item.locale,
        title: item.title
      })),
      ...articleTitles
        .map((item: any) => ({
          type: 'article',
          id: item.article.id,
          slug: item.article.slug,
          locale: item.locale,
          title: item.title
        })),
      ...locations.map((location: any) => ({
        type: 'location',
        id: location.id,
        slug: null,
        locale: 'th',
        title: `${location.province}${location.district ? ' - ' + location.district : ''}`
      }))
    ];

    return suggestions.slice(0, 10);
  }
}
