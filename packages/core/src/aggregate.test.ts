import { describe, expect, it } from 'vitest';
import { aggregate, uniqueSongs } from './aggregate';
import { songKey } from './normalize';
import type { DayFile } from './types';

const day = (date: string, plays: [string, string, string][]): DayFile => ({
  date,
  fetchedAt: `${date}T11:00:00Z`,
  plays: plays.map(([time, title, artist]) => ({ time, title, artist })),
});

const days = [
  day('2026-10-09', [
    ['08:30:14', 'Golden', 'HUNTR/X'],
    ['08:33:00', 'Hero', 'Enrique Iglesias'],
  ]),
  day('2026-10-08', [['12:00:00', 'Golden ', 'HUNTR/X']]),
  day('2026-10-10', []),
];

describe('aggregate', () => {
  it('同じ曲キーのオンエアをまとめて数える', () => {
    const { songs } = aggregate(days, {}, {}, 'now');
    const golden = songs.songs.find((s) => s.key === songKey('Golden', 'HUNTR/X'))!;
    expect(golden.total).toBe(2);
  });

  it('初回オンエア日は最も古い日になる', () => {
    const { songs } = aggregate(days, {}, {}, 'now');
    expect(songs.songs.map((s) => [s.title, s.firstDate])).toEqual([
      ['Golden', '2026-10-08'],
      ['Hero', '2026-10-09'],
    ]);
  });

  it('オンエアを [曲の添字, 日付, 時刻] で返す', () => {
    const { plays } = aggregate(days, {}, {}, 'now');
    expect(plays).toEqual([
      [0, '2026-10-08', '12:00:00'],
      [0, '2026-10-09', '08:30:14'],
      [1, '2026-10-09', '08:33:00'],
    ]);
  });

  it('発表年は手直しを iTunes の結果より優先し、どちらもなければ null にする', () => {
    const golden = songKey('Golden', 'HUNTR/X');
    const hero = songKey('Hero', 'Enrique Iglesias');
    const { songs } = aggregate(
      days,
      {
        [golden]: { year: 2024, lookedUpAt: 'x', itunes: null },
        [hero]: { year: 2001, lookedUpAt: 'x', itunes: null },
      },
      { [golden]: 2025 },
      'now',
    );
    expect(songs.songs.map((s) => s.year)).toEqual([2025, 2001]);
    expect(aggregate(days, {}, {}, 'now').songs.songs[0]!.year).toBeNull();
  });

  it('曲がある日だけで期間の端を決める', () => {
    const { songs } = aggregate(days, {}, {}, 'now');
    expect([songs.earliestDate, songs.latestDate]).toEqual(['2026-10-08', '2026-10-09']);
  });
});

describe('uniqueSongs', () => {
  it('曲キーごとに最も古い日の表記を返す', () => {
    const result = uniqueSongs(days);
    expect([...result.values()]).toEqual([
      { title: 'Golden', artist: 'HUNTR/X' },
      { title: 'Hero', artist: 'Enrique Iglesias' },
    ]);
  });
});
