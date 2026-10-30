import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';

try {
  for (const line of readFileSync('.env', 'utf8').split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1);
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? `var/digest-${night}.html`;
const response = await createApp(loadConfig()).request(`/digest/${night}`);
if (!response.ok) {
  console.error(`${response.status} /digest/${night}`);
  process.exit(1);
}
mkdirSync('var', { recursive: true });
writeFileSync(out, await response.text());
console.log(out);
