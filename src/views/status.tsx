import { readNight } from '../digest/read.js';
import type { Status } from '../status.js';

function countsFor(runsDir: string, night: string): string {
  try {
    const { counts } = readNight(runsDir, night);
    return `ok ${counts.ok} · retry ${counts.retry} · fail ${counts.fail}`;
  } catch {
    return '—';
  }
}

export function StatusBoard({ status, runsDir }: { status: Status; runsDir: string }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n}`}>{n}</a> <span class="mute">{countsFor(runsDir, n)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
