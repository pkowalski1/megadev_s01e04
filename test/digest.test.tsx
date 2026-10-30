import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

function appIn(dir: string) {
  const config: RigConfig = {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  };
  return createApp(config);
}

function tempRuns(): string {
  return mkdtempSync(join(tmpdir(), 'rig-'));
}

const night = [
  '{"at":"2026-10-28T01:00:00+01:00","job":"b","status":"ok","owner":"rook"}',
  '{"at":"2026-10-28T02:00:00+01:00","job":"a","status":"fail","owner":null,"error":"nope"}',
  '{"at":"2026-10-28T03:00:00+01:00","job":"a","status":"retry","owner":"rook"}',
  '{"at":"2026-10-28T04:00:00+01:00","job":"a","status":"retry","owner":"rook"}',
  '{"at":"2026-10-28T05:00:00+01:00","job":"a","status":"retry","owner":"rook"}',
  'not json',
].join('\n');

describe('digest routes', () => {
  it('returns 200 with the same jobs on the page and in JSON', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, '2026-10-28.jsonl'), night);
    const app = appIn(dir);
    const page = await app.request('/digest/2026-10-28');
    const json = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);
    const html = await page.text();
    const body = (await json.json()) as { rows: { job: string }[]; badLines: number };
    const jobs = [...html.matchAll(/data-job="([^"]+)"/g)].map((match) => match[1]);
    expect(body.rows.map((row) => row.job)).toEqual(['a', 'b']);
    expect(jobs).toEqual(body.rows.map((row) => row.job));
    expect(body.badLines).toBe(1);
    expect(html).toContain('class="warn"');
    expect(html).toContain('—');
  });

  it('returns 404 when the night has no file', async () => {
    const app = appIn(tempRuns());
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('renders nothing ran for an empty file', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, '2026-10-28.jsonl'), '');
    const page = await appIn(dir).request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const json = await appIn(dir).request('/api/digest/2026-10-28');
    expect(await json.json()).toEqual({ rows: [], badLines: 0 });
  });

  it('links each night on disk to its digest with counts', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, '2026-10-27.jsonl'), '{"at":"2026-10-27T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}\n');
    writeFileSync(join(dir, '2026-10-28.jsonl'), night);
    const html = await (await appIn(dir).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 1 · retry 0 · fail 0');
    expect(html).toContain('ok 1 · retry 3 · fail 1');
  });
});
