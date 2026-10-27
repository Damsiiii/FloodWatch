import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { readings } from '../src/db/schema';
import { runIngestion, Env } from './ingest';
import { MOCK_SNAPSHOT, MOCK_STATIONS } from './mockData';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/api/snapshot', async (c) => {
  let snapshotStr: string | null = null;
  if (c.env.SNAPSHOT_KV) {
    snapshotStr = await c.env.SNAPSHOT_KV.get('latest_snapshot');
  }

  if (snapshotStr) {
    return c.json(JSON.parse(snapshotStr), 200, {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    });
  }

  return c.json(MOCK_SNAPSHOT, 200, {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
  });
});

app.get('/api/stations/:id/history', async (c) => {
  const stationId = c.req.param('id');

  if (c.env.DB) {
    try {
      const db = drizzle(c.env.DB);
      const rows = await db.select()
        .from(readings)
        .where(eq(readings.station_id, stationId))
        .orderBy(desc(readings.observed_at))
        .limit(168);

      if (rows.length > 0) {
        return c.json({
          station_id: stationId,
          history: rows.reverse()
        }, 200, {
          'Cache-Control': 'public, max-age=300'
        });
      }
    } catch (e) {
      console.warn('Failed querying D1 history:', e);
    }
  }

  const mockStation = MOCK_STATIONS.find(s => s.id === stationId) || MOCK_STATIONS[0];
  return c.json({
    station_id: stationId,
    history: mockStation.history_24h.map(h => ({
      observed_at: h.timestamp,
      water_level: h.level
    }))
  }, 200, {
    'Cache-Control': 'public, max-age=300'
  });
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runIngestion(env));
  }
};
