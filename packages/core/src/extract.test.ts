import { describe, expect, it } from 'vitest';
import { extractPlays } from './extract';
import type { OfficialEntry } from './types';

// 公式JSONの形をまねて手で作ったサンプル
const entry = (time: string, title: string, artist: string): OfficialEntry => ({
  id: '1',
  time,
  title,
  artist,
  url: '',
  appletrackid: '',
});

describe('extractPlays', () => {
  it('番組の区切りと挨拶を除き、曲だけを3項目で返す', () => {
    const plays = extractPlays([
      entry('08:01:00', '農のミライ', '8:01 〜 8:30'),
      entry('08:30:00', 'いい音楽で 生活に彩りを♪', 'RaNi Music♪'),
      entry('08:30:14', 'Golden', 'HUNTR/X'),
      entry('19:00:00', 'また明日！', 'RaNi Music♪'),
    ]);
    expect(plays).toEqual([{ time: '08:30:14', title: 'Golden', artist: 'HUNTR/X' }]);
  });

  it('RaNi Music 以外の番組の時間帯に入る曲を除く', () => {
    const plays = extractPlays([
      entry('15:00:00', '判断力の源', '15:00 〜 15:03'),
      entry('15:01:30', 'BGM', 'Someone'),
      entry('15:03:10', 'Hero', 'Enrique Iglesias'),
    ]);
    expect(plays.map((p) => p.title)).toEqual(['Hero']);
  });

  it('RaNi Music の番組名を持つ区切りの時間帯の曲は残す', () => {
    const plays = extractPlays([
      entry('12:00:00', 'RaNi Music♪All Request Hour', '12:00 〜 13:08'),
      entry('12:00:45', 'Power of Love', 'Huey Lewis and the News'),
    ]);
    expect(plays.map((p) => p.title)).toEqual(['Power of Love']);
  });

  it('区切りの終了時刻ちょうどの曲は残す', () => {
    const plays = extractPlays([
      entry('17:00:00', 'ルミナス tomorrow', '17:00 〜 17:10'),
      entry('17:10:00', 'Supermarket', 'SEKAI NO OWARI'),
    ]);
    expect(plays).toHaveLength(1);
  });

  it('時刻順に並べる', () => {
    const plays = extractPlays([
      entry('09:45:00', 'B', 'b'),
      entry('08:30:14', 'A', 'a'),
    ]);
    expect(plays.map((p) => p.title)).toEqual(['A', 'B']);
  });

  it('土日の挨拶だけの日は空になる', () => {
    expect(extractPlays([entry('05:00:00', 'よい週末を！', 'RaNi Music♪')])).toEqual([]);
  });

  it('値は正規化せずに返す', () => {
    const plays = extractPlays([entry('10:05:00', 'What Am I ', "Why Don't We")]);
    expect(plays[0]!.title).toBe('What Am I ');
  });
});
