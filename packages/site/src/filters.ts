import { normalizeText, type PlayTuple, type Song } from '@rani/core';

export type SortKey = 'title' | 'artist' | 'year' | 'count' | 'firstDate';

export interface Filters {
  from: string;
  to: string;
  title: string;
  artist: string;
  yearMin: string;
  yearMax: string;
  newOnly: boolean;
  topN: number;
  sort: SortKey;
  desc: boolean;
}

export const TOP_N_OPTIONS = [10, 30, 50] as const;
const SORT_KEYS: SortKey[] = ['title', 'artist', 'year', 'count', 'firstDate'];

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function defaultFilters(latest: string): Filters {
  return {
    from: addDays(latest, -29),
    to: latest,
    title: '',
    artist: '',
    yearMin: '',
    yearMax: '',
    newOnly: false,
    topN: 30,
    sort: 'count',
    desc: true,
  };
}

/** URL のクエリから絞り込み条件を復元する。ない項目は既定値にする */
export function filtersFromQuery(search: string, defaults: Filters): Filters {
  const q = new URLSearchParams(search);
  const date = (v: string | null, d: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
  const topN = Number(q.get('top'));
  const sort = q.get('sort') as SortKey | null;
  return {
    from: date(q.get('from'), defaults.from),
    to: date(q.get('to'), defaults.to),
    title: q.get('title') ?? '',
    artist: q.get('artist') ?? '',
    yearMin: q.get('ymin') ?? '',
    yearMax: q.get('ymax') ?? '',
    newOnly: q.get('new') === '1',
    topN: (TOP_N_OPTIONS as readonly number[]).includes(topN) ? topN : defaults.topN,
    sort: sort && SORT_KEYS.includes(sort) ? sort : defaults.sort,
    desc: q.has('dir') ? q.get('dir') !== 'asc' : defaults.desc,
  };
}

/** 既定値と違う項目だけをクエリにする */
export function filtersToQuery(f: Filters, defaults: Filters): string {
  const q = new URLSearchParams();
  if (f.from !== defaults.from) q.set('from', f.from);
  if (f.to !== defaults.to) q.set('to', f.to);
  if (f.title) q.set('title', f.title);
  if (f.artist) q.set('artist', f.artist);
  if (f.yearMin) q.set('ymin', f.yearMin);
  if (f.yearMax) q.set('ymax', f.yearMax);
  if (f.newOnly) q.set('new', '1');
  if (f.topN !== defaults.topN) q.set('top', String(f.topN));
  if (f.sort !== defaults.sort) q.set('sort', f.sort);
  if (f.desc !== defaults.desc) q.set('dir', f.desc ? 'desc' : 'asc');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface Row {
  index: number;
  song: Song;
  count: number;
}

/** 期間内のオンエア回数を数え、条件に合う曲を返す（並べ替え済み） */
export function applyFilters(songs: Song[], plays: PlayTuple[], f: Filters): Row[] {
  const counts = new Array<number>(songs.length).fill(0);
  for (const [i, date] of plays) {
    if (f.from <= date && date <= f.to) counts[i]! += 1;
  }

  const title = normalizeText(f.title);
  const artist = normalizeText(f.artist);
  const yearMin = f.yearMin ? Number(f.yearMin) : null;
  const yearMax = f.yearMax ? Number(f.yearMax) : null;

  const rows: Row[] = [];
  songs.forEach((song, index) => {
    const count = counts[index]!;
    if (count === 0) return;
    if (title && !normalizeText(song.title).includes(title)) return;
    if (artist && !normalizeText(song.artist).includes(artist)) return;
    if (yearMin !== null || yearMax !== null) {
      // 発表年で絞ったときは、発表年が不明の曲を除く
      if (song.year === null) return;
      if (yearMin !== null && song.year < yearMin) return;
      if (yearMax !== null && song.year > yearMax) return;
    }
    if (f.newOnly && !(f.from <= song.firstDate && song.firstDate <= f.to)) return;
    rows.push({ index, song, count });
  });

  const dir = f.desc ? -1 : 1;
  const value = (r: Row): string | number => {
    switch (f.sort) {
      case 'count':
        return r.count;
      case 'year':
        // 不明の曲は、どちらの向きでも末尾に置く
        return r.song.year ?? (f.desc ? -Infinity : Infinity);
      case 'firstDate':
        return r.song.firstDate;
      default:
        return normalizeText(r.song[f.sort]);
    }
  };
  return rows.sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return b.count - a.count || a.song.title.localeCompare(b.song.title);
  });
}

/** オンエア回数の多い順に上位 n 曲を返す */
export function topRows(rows: Row[], n: number): Row[] {
  return [...rows]
    .sort((a, b) => b.count - a.count || a.song.title.localeCompare(b.song.title))
    .slice(0, n);
}
