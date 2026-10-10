import type { PlayTuple, Song } from '@rani/core';
import { describe, expect, it } from 'vitest';
import { applyFilters, defaultFilters, filtersFromQuery, filtersToQuery, topRows, type Filters } from './filters';

const song = (title: string, artist: string, year: number | null, firstDate: string): Song => ({
  key: `${title}\t${artist}`,
  title,
  artist,
  year,
  firstDate,
  total: 0,
});

const songs = [
  song('Golden', 'HUNTR/X', 2025, '2026-10-01'),
  song('Hero', 'Enrique Iglesias', 2001, '2026-09-01'),
  song('Ｍｙｓｔｅｒｙ', 'Unknown', null, '2026-10-08'),
];

const plays: PlayTuple[] = [
  [0, '2026-10-01', '08:30:00'],
  [0, '2026-10-08', '08:30:00'],
  [0, '2026-10-09', '08:30:00'],
  [1, '2026-09-01', '09:00:00'],
  [1, '2026-10-09', '09:00:00'],
  [2, '2026-10-08', '10:00:00'],
];

const base: Filters = { ...defaultFilters('2026-10-09'), from: '2026-10-01', to: '2026-10-09' };
const titles = (f: Partial<Filters>) => applyFilters(songs, plays, { ...base, ...f }).map((r) => r.song.title);

describe('applyFilters', () => {
  it('期間内の回数を数え、回数の多い順に並べる', () => {
    const rows = applyFilters(songs, plays, base);
    expect(rows.map((r) => [r.song.title, r.count])).toEqual([
      ['Golden', 3],
      ['Hero', 1],
      ['Ｍｙｓｔｅｒｙ', 1],
    ]);
  });

  it('期間内に流れていない曲は出さない', () => {
    expect(titles({ from: '2026-10-08', to: '2026-10-08' })).toEqual(['Golden', 'Ｍｙｓｔｅｒｙ']);
  });

  it('曲名とアーティストは正規化して部分一致で探す', () => {
    expect(titles({ title: 'myst' })).toEqual(['Ｍｙｓｔｅｒｙ']);
    expect(titles({ artist: 'huntr' })).toEqual(['Golden']);
  });

  it('発表年で絞ると、発表年が不明の曲を除く', () => {
    expect(titles({ yearMin: '2000' })).toEqual(['Golden', 'Hero']);
    expect(titles({ yearMax: '2010' })).toEqual(['Hero']);
  });

  it('期間内に初めて流れた曲だけに絞れる', () => {
    expect(titles({ newOnly: true })).toEqual(['Golden', 'Ｍｙｓｔｅｒｙ']);
  });

  it('発表年で並べ替えると、不明の曲は末尾に置く', () => {
    expect(titles({ sort: 'year', desc: true })).toEqual(['Golden', 'Hero', 'Ｍｙｓｔｅｒｙ']);
    expect(titles({ sort: 'year', desc: false })).toEqual(['Hero', 'Golden', 'Ｍｙｓｔｅｒｙ']);
  });
});

describe('topRows', () => {
  it('並べ替えの指定にかかわらず、回数の多い順に上位を返す', () => {
    const rows = applyFilters(songs, plays, { ...base, sort: 'title', desc: false });
    expect(topRows(rows, 1).map((r) => r.song.title)).toEqual(['Golden']);
  });
});

describe('URL のクエリ', () => {
  const defaults = defaultFilters('2026-10-09');

  it('既定値のままならクエリは空になる', () => {
    expect(filtersToQuery(defaults, defaults)).toBe('');
  });

  it('クエリに書いた条件を復元できる', () => {
    const f: Filters = { ...defaults, from: '2026-01-01', artist: 'スピッツ', yearMin: '1990', newOnly: true, topN: 10, sort: 'year', desc: false };
    expect(filtersFromQuery(filtersToQuery(f, defaults), defaults)).toEqual(f);
  });

  it('不正な値は既定値にする', () => {
    expect(filtersFromQuery('?from=abc&top=7&sort=evil', defaults)).toEqual(defaults);
  });
});
