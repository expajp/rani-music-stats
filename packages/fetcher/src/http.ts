export const USER_AGENT = 'rani-music-stats (+https://github.com/expajp/rani-music-stats)';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 前回のリクエストから一定の間隔を空けてから実行する */
export function throttle(intervalMs: number) {
  let last = 0;
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const wait = last + intervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      last = Date.now();
    }
  };
}

export async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return { status: res.status, body: null };
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: null };
  }
}
