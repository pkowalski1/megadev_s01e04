import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, NightRead } from './types.js';

const STATUSES = new Set<DigestStatus>(['ok', 'retry', 'fail']);

export class NightNotFound extends Error {
  constructor(night: string) {
    super(`no run log for ${night}`);
    this.name = 'NightNotFound';
  }
}

type Event = {
  at: string;
  ms: number;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error: string | null;
};

export function readNight(runsDir: string, night: string): NightRead {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) throw new NightNotFound(night);
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NightNotFound(night);
    throw error;
  }

  const events: Event[] = [];
  let badLines = 0;
  const counts = { ok: 0, retry: 0, fail: 0 };
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  for (const line of lines) {
    const event = parseLine(line);
    if (!event) {
      badLines += 1;
      continue;
    }
    events.push(event);
    counts[event.status] += 1;
  }

  const byJob = new Map<string, DigestRow & { firstMs: number; lastMs: number }>();
  for (const event of events) {
    const row = byJob.get(event.job);
    if (!row) {
      byJob.set(event.job, {
        job: event.job,
        owner: event.owner,
        runs: 1,
        retries: event.status === 'retry' ? 1 : 0,
        lastStatus: event.status,
        lastError: event.error,
        firstAt: event.at,
        lastAt: event.at,
        firstMs: event.ms,
        lastMs: event.ms,
      });
      continue;
    }
    row.runs += 1;
    if (event.status === 'retry') row.retries += 1;
    if (event.ms < row.firstMs) {
      row.firstMs = event.ms;
      row.firstAt = event.at;
    }
    if (event.ms >= row.lastMs) {
      row.lastMs = event.ms;
      row.lastAt = event.at;
      row.lastStatus = event.status;
      row.lastError = event.error;
      row.owner = event.owner;
    }
  }

  const rows = [...byJob.values()]
    .sort((a, b) => a.job.localeCompare(b.job))
    .map(({ firstMs: _first, lastMs: _last, ...row }) => row);

  return { rows, badLines, counts };
}

function parseLine(line: string): Event | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const { at, job, status, owner, error } = record;
  if (typeof at !== 'string' || typeof job !== 'string' || job === '') return null;
  if (typeof status !== 'string' || !STATUSES.has(status as DigestStatus)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return null;
  return { at, ms, job, status: status as DigestStatus, owner, error: error ?? null };
}
