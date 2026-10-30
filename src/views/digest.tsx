import type { NightRead } from '../digest/types.js';

export function DigestPage({ night, read }: { night: string; read: NightRead }) {
  if (read.rows.length === 0 && read.badLines === 0) return <p>nothing ran</p>;
  return (
    <>
      <h1>digest {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {read.rows.map((row) => (
            <tr class={row.retries >= 3 || row.lastStatus === 'fail' ? 'warn' : undefined} data-job={row.job}>
              <td>{row.job}</td>
              <td>{row.owner ?? '—'}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{row.lastError ?? '—'}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
