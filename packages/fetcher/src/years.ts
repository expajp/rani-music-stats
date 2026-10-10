import { uniqueSongs, type ItunesHit, type YearsFile } from '@rani/core';
import { getJson, sleep, throttle } from './http';
import { readAllDays, readYears, writeYears } from './store';

// iTunes Search API の目安は1分に20回
const INTERVAL_MS = 3_500;
const RATE_LIMIT_WAIT_MS = 60_000;
const SAVE_EVERY = 20;

class RateLimited extends Error {}

/** 発表年を調べるべき曲キーを返す */
export function planYears(keys: Iterable<string>, years: YearsFile, retryMissing: boolean): string[] {
  return [...keys].filter((k) => !(k in years) || (retryMissing && years[k]!.year === null));
}

async function searchItunes(title: string, artist: string): Promise<ItunesHit | null> {
  const params = new URLSearchParams({
    term: `${title} ${artist}`,
    country: 'JP',
    media: 'music',
    entity: 'song',
    limit: '1',
  });
  const { status, body } = await getJson(`https://itunes.apple.com/search?${params}`);
  if (status === 403 || status === 429) throw new RateLimited(`HTTP ${status}`);
  if (!body || typeof body !== 'object') throw new Error(`HTTP ${status}`);
  const hit = (body as { results?: Record<string, unknown>[] }).results?.[0];
  if (!hit || typeof hit.releaseDate !== 'string') return null;
  return {
    trackId: Number(hit.trackId),
    trackName: String(hit.trackName ?? ''),
    artistName: String(hit.artistName ?? ''),
    releaseDate: hit.releaseDate.slice(0, 10),
  };
}

/** 発表年が未検索の曲を iTunes で検索し、data/years.json に追記する */
export async function runYears(options: { max?: number; retryMissing: boolean }): Promise<void> {
  const songs = uniqueSongs(await readAllDays());
  const years = await readYears();
  const targets = planYears(songs.keys(), years, options.retryMissing).slice(0, options.max);
  const throttled = throttle(INTERVAL_MS);

  let stopped = false;
  const onSignal = () => {
    stopped = true;
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  console.log(`検索対象：${targets.length}曲（未検索の全体：${planYears(songs.keys(), years, options.retryMissing).length}曲）`);
  let done = 0;
  try {
    for (const key of targets) {
      if (stopped) break;
      const { title, artist } = songs.get(key)!;
      let hit: ItunesHit | null;
      try {
        hit = await throttled(() => searchItunes(title, artist)).catch(async (e) => {
          if (!(e instanceof RateLimited)) throw e;
          console.warn(`::warning::iTunes の利用制限にかかりました。${RATE_LIMIT_WAIT_MS / 1000}秒待ちます`);
          await sleep(RATE_LIMIT_WAIT_MS);
          return throttled(() => searchItunes(title, artist));
        });
      } catch (e) {
        if (e instanceof RateLimited) {
          console.warn('::warning::iTunes の利用制限が続くため、検索を中断します');
          break;
        }
        console.warn(`::warning::${title} / ${artist} の検索に失敗しました（${(e as Error).message}）`);
        continue;
      }
      years[key] = {
        year: hit ? Number(hit.releaseDate.slice(0, 4)) : null,
        lookedUpAt: new Date().toISOString(),
        itunes: hit,
      };
      done += 1;
      if (done % SAVE_EVERY === 0) {
        await writeYears(years);
        console.log(`${done}/${targets.length}曲を検索しました`);
      }
    }
  } finally {
    await writeYears(years);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }
  console.log(`検索を終えました：${done}曲`);
}
