export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightRead = {
  rows: DigestRow[];
  badLines: number;
};

export function readNight(runsDir: string, night: string): NightRead {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented');
}
