import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { NightNotFound, readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} runsDir={config.runsDir} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    try {
      const night = c.req.param('night');
      return c.html(
        <Layout title={`digest ${night}`} lane={lane()}>
          <DigestPage night={night} read={readNight(config.runsDir, night)} />
        </Layout>,
      );
    } catch (error) {
      if (error instanceof NightNotFound) return c.text('not found', 404);
      throw error;
    }
  });

  app.get('/api/digest/:night', (c) => {
    try {
      const night = c.req.param('night');
      const read = readNight(config.runsDir, night);
      return c.json({ rows: read.rows, badLines: read.badLines });
    } catch (error) {
      if (error instanceof NightNotFound) return c.json({ error: 'not found' }, 404);
      throw error;
    }
  });

  return app;
}
