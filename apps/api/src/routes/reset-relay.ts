import type { FastifyInstance } from 'fastify';
import { readResetRelay } from '@aihot/backend/publication/reset-relay';
import { readPublicSnapshot } from '@aihot/backend/publication/reset-public';
import { readNews } from '@aihot/backend/publication/ai-news';

export function registerResetRelay(app: FastifyInstance) {
  app.get('/api/site/ai-news', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return readNews();
  });
  app.get('/api/public/v1/snapshot', async (req, reply) => {
    reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    reply.header('CDN-Cache-Control', 'no-store');
    const snapshot = await readPublicSnapshot();
    if (!snapshot) return reply.code(503).send({ code: 'snapshot_not_imported' });
    const etag = '"' + snapshot.revision + '"';
    reply.header('ETag', etag);
    const match = req.headers['if-none-match']?.split(',').some(s => s.trim() === '*' || s.trim().replace(/^W\//, '') === etag);
    if (match) return reply.code(304).send();
    return snapshot;
  });
  app.get('/api/site/reset-relay', async (_req, reply) => {
    const snapshot = await readResetRelay();
    reply.header('Cache-Control', 'no-store');
    if (!snapshot) return reply.code(503).send({ code: 'snapshot_not_imported' });
    return snapshot;
  });
}
