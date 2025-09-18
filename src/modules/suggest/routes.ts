import { FastifyInstance } from 'fastify';
import { suggestQuerySchema } from './schemas';
import { SuggestService } from './service';

export async function registerSuggestRoutes(app: FastifyInstance) {
  app.get('/api/suggest', async (request) => {
    const query = suggestQuerySchema.parse(request.query);
    const suggestions = await SuggestService.search(query.q);
    return { suggestions };
  });
}
