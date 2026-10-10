import type { OfficialEntry, Play } from './types';

// 番組の区切りの artist は「17:00 〜 17:10」の形。波ダッシュの種類の違いも受け入れる
const RANGE = /^(\d{1,2}):(\d{2})\s*[〜～~]\s*(\d{1,2}):(\d{2})$/;

function toSeconds(h: string, m: string, s = '0'): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function timeToSeconds(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  return m ? toSeconds(m[1]!, m[2]!, m[3]) : null;
}

/**
 * 公式JSONから RaNi Music の曲だけを取り出し、時刻順に並べる。
 * 番組の区切りと、RaNi Music 以外の番組の時間帯に入る曲は除く。
 */
export function extractPlays(entries: OfficialEntry[]): Play[] {
  const excludedRanges: [number, number][] = [];
  const candidates: OfficialEntry[] = [];

  for (const e of entries) {
    const artist = (e.artist ?? '').trim();
    const range = RANGE.exec(artist);
    if (range) {
      if (!e.title.includes('RaNi Music')) {
        excludedRanges.push([toSeconds(range[1]!, range[2]!), toSeconds(range[3]!, range[4]!)]);
      }
      continue;
    }
    if (artist.includes('RaNi Music')) continue;
    candidates.push(e);
  }

  return candidates
    .filter((e) => {
      const t = timeToSeconds(e.time);
      if (t === null || !e.title.trim() || !e.artist.trim()) return false;
      return !excludedRanges.some(([from, to]) => from <= t && t < to);
    })
    .map((e) => ({ time: e.time, title: e.title, artist: e.artist }))
    .sort((a, b) => a.time.localeCompare(b.time));
}
